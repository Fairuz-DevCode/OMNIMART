import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import hpp from "hpp";

import env from "./config/env.js";
import { AppError } from "./utils/appError.js";
import { handleJsonSyntaxError } from "./middleware/jsonErrorMiddleware.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import {
  securityHeaders,
  enforceHttps,
  rateLimiter,
  speedLimiter,
} from "./middleware/securityMiddleware.js";
import { requestTimeout } from "./middleware/timeoutMiddleware.js";
import { csrfProtection } from "./middleware/csrfMiddleware.js";
import { auditLogger } from "./middleware/auditLogMiddleware.js";
import { accessLogger } from "./middleware/accessLogMiddleware.js";

import healthRoutes from "./modules/health/health.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import advancedAuthRoutes from "./modules/auth/advancedAuth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import addressRoutes from "./modules/address/address.routes.js";
import categoryRoutes from "./modules/category/category.routes.js";
import productRoutes from "./modules/product/product.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import orderRoutes from "./modules/order/order.routes.js";
import paymentRoutes from "./modules/payment/payment.routes.js";
import shippingRoutes from "./modules/shipping/shipping.routes.js";
import reviewRoutes from "./modules/review/review.routes.js";
import wishlistRoutes from "./modules/wishlist/wishlist.routes.js";

const app = express();

// Trust reverse proxy (untuk Cloudflare / Nginx / Load Balancer agar IP asli terbaca)
app.set("trust proxy", 1);

// HTTP Access Logging (Mencatat seluruh lalu lintas HTTP ke daily JSONL log stream)
app.use(accessLogger());

// 1. SSL/TLS & HTTP Security Headers
app.use(enforceHttps);
app.use(securityHeaders);

// 2. Throttling / DDoS Mitigation (Memperlambat banjir request bertubi-tubi)
app.use(speedLimiter);

// 3. Global Rate Limiting (Maksimal 150 request per 15 menit per IP)
const globalApiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: "Too many requests from this IP, please try again after 15 minutes.",
  prefix: "global_ratelimit",
});
app.use("/api", globalApiLimiter);

// 4. Strict Auth Rate Limiting (Maksimal 15 percobaan auth per 15 menit untuk cegah credential stuffing)
const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many authentication requests, please try again in 15 minutes.",
  prefix: "auth_ratelimit",
});

// 5. Hardened CORS Policy (Environment-Aware, Subdomain Support & 403 Forbidden Error Handling)
const parseExtraOrigins = (originsStr?: string): string[] => {
  if (!originsStr) return [];
  return originsStr
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
};

const extraOrigins = parseExtraOrigins(env.ALLOWED_ORIGINS);

const allowedOrigins: (string | RegExp)[] =
  env.NODE_ENV === "production"
    ? [
        env.CLIENT_URL,
        ...extraOrigins,
        // Mendukung subdomain resmi Nexa di production (misal https://admin.nexa.com, https://checkout.nexa.com)
        /^https:\/\/([a-z0-9-]+\.)?nexa\.com$/,
      ].filter(Boolean)
    : [
        env.CLIENT_URL,
        ...extraOrigins,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
      ].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // 1. Izinkan request tanpa origin (misal mobile app, curl, server-to-server webhook Midtrans)
      if (!origin) {
        return callback(null, true);
      }

      // 2. Evaluasi terhadap daftar putih (string exact match atau regex pattern)
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        // 3. Tolak dengan 403 Forbidden yang terdefinisi rapi, bukan 500 error
        callback(new AppError(`CORS policy violation: Origin '${origin}' is not allowed`, 403));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "X-Idempotency-Key",
      "x-csrf-token",
      "csrf-token",
    ],
    exposedHeaders: [
      "X-Idempotent-Replay",
      "X-Cache",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "Retry-After",
    ],
    maxAge: 86400, // Preflight cache 24 jam (mengurangi beban request OPTIONS berulang)
  })
);

// 6. Payload Size Limits & HTTP Parameter Pollution (HPP) Defense
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(hpp());

app.use(cookieParser());
app.use(csrfProtection); // Proteksi Anti-CSRF via Double-Submit Cookie
app.use(auditLogger()); // Rekam jejak digital mutasi data (Audit Logging)
app.use(requestTimeout(15000)); // 15s global timeout untuk mencegah hanging connections

app.use(handleJsonSyntaxError);

// Health check endpoint (tidak perlu rate limit/auth untuk Docker & K8s probes)
app.use("/api", healthRoutes);

// Serve static images from public folder
app.use("/public", express.static(path.join(process.cwd(), "public")));
app.use("/uploads/products", express.static(path.join(process.cwd(), "public/img/products")));
app.use("/uploads", express.static(path.join(process.cwd(), "public/img")));
app.use("/img/products", express.static(path.join(process.cwd(), "public/img/products")));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/auth", authLimiter, advancedAuthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/api/carts", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/shippings", shippingRoutes);
app.use("/api/wishlist", wishlistRoutes);

app.use(errorHandler);

export default app;
