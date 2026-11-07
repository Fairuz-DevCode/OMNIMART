import { PrismaClient } from "@prisma/client";
import { readReplicas } from "@prisma/extension-read-replicas";

/**
 * Membuat Prisma Client instance dengan dukungan Read/Write Splitting.
 * - Primary DB (DATABASE_URL): Menangani operasi write (create, update, delete, $transaction).
 * - Replica DB (DATABASE_REPLICA_URL): Menangani query baca dengan variasi tinggi (findMany, search, filter).
 * - Fallback: Jika DATABASE_REPLICA_URL tidak diatur (misal di local dev), seluruh query dialihkan ke Primary DB.
 */
function createPrismaClient(): PrismaClient {
  const baseClient = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  const replicaUrl = process.env.DATABASE_REPLICA_URL;

  if (replicaUrl) {
    const extendedClient = baseClient.$extends(
      readReplicas({
        url: replicaUrl,
      })
    );
    return extendedClient as unknown as PrismaClient;
  }

  return baseClient;
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
