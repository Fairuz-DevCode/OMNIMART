import { PrismaClient } from "@prisma/client";

/**
 * Opsi konfigurasi retry transaksi database
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * Memeriksa apakah error yang terjadi merupakan Deadlock atau Konflik Konkurensi
 * - P2034: Prisma Transaction failed due to a write conflict or deadlock
 * - 40P01: PostgreSQL Deadlock detected
 * - 40001: PostgreSQL Serialization failure
 */
function isDeadlockOrConflictError(error: any): boolean {
  if (!error) return false;

  const errorCode = error.code || "";
  const errorMessage = error.message || "";

  return (
    errorCode === "P2034" ||
    errorCode === "40P01" ||
    errorCode === "40001" ||
    errorMessage.includes("deadlock detected") ||
    errorMessage.includes("could not serialize access") ||
    errorMessage.includes("write conflict")
  );
}

/**
 * Menjalankan operasi transaksi Prisma dengan proteksi Deadlock Storm.
 * Jika terdeteksi deadlock, transaksi akan diulang secara otomatis menggunakan
 * jeda waktu Exponential Backoff + Random Jitter untuk meredam lonjakan serentak.
 *
 * @param prismaInstance Instance Prisma Client
 * @param operation Callback fungsi transaksi yang menerima tx client
 * @param options Opsi jumlah percobaan ulang dan jeda dasar
 */
export async function executeWithRetry<T>(
  prismaInstance: PrismaClient,
  operation: (tx: any) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 50;
  let attempt = 0;

  while (true) {
    try {
      attempt++;
      return await prismaInstance.$transaction(operation);
    } catch (error: any) {
      const isDeadlock = isDeadlockOrConflictError(error);

      // Jika bukan deadlock/konflik, atau batas retry sudah habis, lempar error asli
      if (!isDeadlock || attempt >= maxRetries) {
        throw error;
      }

      // Rumus Exponential Backoff + Random Jitter
      // Contoh: attempt 1 -> 50ms * 2^1 + random(0-50ms) = ~120ms
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * baseDelayMs);
      const totalDelay = exponentialDelay + jitter;

      console.warn(
        `[Deadlock Warning] Terdeteksi deadlock/konflik konkurensi (attempt ${attempt}/${maxRetries}). ` +
          `Menunggu ${totalDelay}ms sebelum retry...`
      );

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }
}
