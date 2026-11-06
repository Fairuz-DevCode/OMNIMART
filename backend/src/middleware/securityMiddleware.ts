import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import slowDown from "express-slow-down";
import redis from "../config/redis.js";
import env from "../config/env.js";

/**
 * Helmet Security Headers (HSTS, CSP, XSS Filter, Frameguard).
 * Memaksa SSL/TLS di production lewat Strict-Transport-Security (HSTS).
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // Set false jika melayani client React SPA terpisah
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 tahun
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Enforce HTTPS / SSL / TLS di reverse proxy (Nginx, Cloudflare, Traefik, AWS ALB).
 */
export const enforceHttps = (req: Request, res: Response, next: NextFunction) => {
  if (
    env.NODE_ENV === "production" &&
    req.headers["x-forwarded-proto"] &&
    req.headers["x-forwarded-proto"] !== "https"
  ) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};

/**
 * Throttling (Slow Down) Middleware:
 * Meredam serangan Brute-Force & DDoS dengan memperlambat respons secara eksponensial
 * sebelum request diblokir total oleh Rate Limiter.
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 menit
  delayAfter: 50, // Mulai memperlambat setelah 50 request dalam 15 menit
  delayMs: (hits) => (hits - 50) * 500, // Menambah delay 500ms per request berlebih
  maxDelayMs: 20000, // Maksimal delay 20 detik
  validate: { trustProxy: false },
});

/**
 * Rate Limiter berbasis Redis Atomic INCR.
 * Membatasi jumlah request per IP untuk melindungi server dari serangan DoS/DDoS.
 */
export const rateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  prefix?: string;
}) => {
  const windowSeconds = Math.ceil(options.windowMs / 1000);
  const prefix = options.prefix || "ratelimit";

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${prefix}:${ip}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Kirim header standard rate limit
      res.setHeader("X-RateLimit-Limit", options.max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, options.max - current));

      if (current > options.max) {
        return res.status(429).json({
          status: "error",
          message: options.message || "Too many requests, please slow down.",
        });
      }

      next();
    } catch {
      // Fallback jika Redis disconnect agar tidak mematikan service
      next();
    }
  };
};
