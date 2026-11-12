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
  DB_SSL: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required for Prisma"),
  DATABASE_REPLICA_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),

  // Redis configuration
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.string().default("6379").transform((val) => parseInt(val, 10)),
  REDIS_PASSWORD: z.string().optional(),

  // JWT Secrets (Wajib minimal 32 karakter untuk memenuhi standar RFC 7518 HS256 & OWASP)
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters long for cryptographic security"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters long for cryptographic security"),

  // Client URL (CORS origin)
  CLIENT_URL: z.string().default("http://localhost:5173"),
  ALLOWED_ORIGINS: z.string().optional(), // Daftar origin tambahan dipisah koma (contoh: "https://admin.nexa.com,https://staging.nexa.com")

  // Midtrans Payment Gateway
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_CLIENT_KEY: z.string().optional(),
  MIDTRANS_IS_PRODUCTION: z
    .string()
    .optional()
    .transform((val) => val === "true"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),

  // SMTP Email Configuration (untuk Email OTP & Security Alerts)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default("587").transform((val) => parseInt(val, 10)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Nexa Streetwear <no-reply@nexa.com>"),
}).superRefine((data, ctx) => {
  // Aturan Pengetatan Khusus Lingkungan Produksi (Production-Specific Hardening)
  if (data.NODE_ENV === "production") {
    // 1. Password database dilarang kosong di production
    if (!data.DB_PASSWORD || data.DB_PASSWORD.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DB_PASSWORD"],
        message: "DB_PASSWORD cannot be empty in production environment",
      });
    }

    // 2. Client URL wajib menggunakan protokol HTTPS terenkripsi
    if (!data.CLIENT_URL.startsWith("https://")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLIENT_URL"],
        message: "CLIENT_URL must use HTTPS protocol in production",
      });
    }

    // 3. Larangan menggunakan dummy / placeholder secret untuk JWT
    const dummyKeywords = ["your_super_secret", "secret123", "placeholder", "admin123", "change_me"];
    if (dummyKeywords.some((dummy) => data.JWT_ACCESS_SECRET.toLowerCase().includes(dummy))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_ACCESS_SECRET"],
        message: "JWT_ACCESS_SECRET cannot use default placeholder in production",
      });
    }
    if (dummyKeywords.some((dummy) => data.JWT_REFRESH_SECRET.toLowerCase().includes(dummy))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_REFRESH_SECRET cannot use default placeholder in production",
      });
    }

    // 4. Verifikasi Midtrans production key jika mode production aktif
    if (data.MIDTRANS_IS_PRODUCTION && data.MIDTRANS_SERVER_KEY?.startsWith("SB-")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MIDTRANS_SERVER_KEY"],
        message: "MIDTRANS_SERVER_KEY cannot use Sandbox key ('SB-') when MIDTRANS_IS_PRODUCTION is true",
      });
    }
  }
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
