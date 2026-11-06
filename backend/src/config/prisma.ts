import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Prisma Client singleton instance.
 * Menggunakan connection pool yang dikonfigurasi via DATABASE_URL:
 * misal: postgresql://...?connection_limit=20&pool_timeout=10
 * Menghindari database connection leak dan pool exhaustion saat hot-reload.
 */
export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
