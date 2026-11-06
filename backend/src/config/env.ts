import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";

/**
 * Validasi ketat untuk seluruh Environment Variables aplikasi.
 * Server akan langsung throw error (fail-fast) saat startup jika ada konfigurasi
 * atau secret penting yang hilang / belum diisi, mencegah celah security dari hardcoded defaults.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("5000").transform((val) => parseInt(val, 10)),
  
  // Database configuration
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.string().default("5432").transform((val) => parseInt(val, 10)),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().default(""),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required for Prisma"),

  // Redis configuration
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.string().default("6379").transform((val) => parseInt(val, 10)),
  REDIS_PASSWORD: z.string().optional(),

  // JWT Secrets (Wajib minimal 16 karakter untuk keamanan)
  JWT_ACCESS_SECRET: z.string().min(8, "JWT_ACCESS_SECRET must be at least 8 characters long"),
  JWT_REFRESH_SECRET: z.string().min(8, "JWT_REFRESH_SECRET must be at least 8 characters long"),

  // Client URL (CORS origin)
  CLIENT_URL: z.string().default("http://localhost:5173"),

  // Midtrans Payment Gateway
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_CLIENT_KEY: z.string().optional(),
  MIDTRANS_IS_PRODUCTION: z
    .string()
    .optional()
    .transform((val) => val === "true"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ CRITICAL: Invalid or missing Environment Variables:");
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
};

export const env = parseEnv();
export default env;
