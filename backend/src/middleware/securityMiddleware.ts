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
 * Enforce HTTPS / SSL / TLS:
 * Mengalihkan seluruh request HTTP ke HTTPS (301 Permanent Redirect)
 * baik di level direct server maupun di belakang Reverse Proxy (Cloudflare, Nginx, AWS ALB, Traefik).
 */
export const enforceHttps = (req: Request, res: Response, next: NextFunction) => {
  if (env.NODE_ENV === "production") {
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    if (!isHttps) {
      const host = req.headers.host || "localhost";
      return res.redirect(301, `https://${host}${req.url}`);
    }
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
    // Membaca IP asli pengunjung: prioritaskan header Cloudflare (cf-connecting-ip),
    // lalu reverse proxy x-forwarded-for (req.ip), atau fallback ke socket address
    const ip = (req.headers["cf-connecting-ip"] as string) || req.ip || req.socket.remoteAddress || "unknown";
    const key = `${prefix}:${ip}`;
    const effectiveMax = env.NODE_ENV === "test" ? options.max * 50 : options.max;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      } else {
        // Defensive check: pastikan key tidak abadi jika redis sempat restart/disconnect saat pembuatan
        const ttl = await redis.ttl(key).catch(() => -1);
        if (ttl === -1) {
          await redis.expire(key, windowSeconds).catch(() => {});
        }
      }

      // Kirim header standard rate limit (RFC 6585)
      res.setHeader("X-RateLimit-Limit", options.max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, options.max - current));

      if (current > effectiveMax) {
        const ttl = await redis.ttl(key).catch(() => windowSeconds);
        const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;
        res.setHeader("Retry-After", retryAfterSeconds);

        return res.status(429).json({
          status: "fail",
          message: options.message || "Too many requests, please slow down.",
          retryAfter: retryAfterSeconds,
        });
      }

      next();
    } catch {
      // Fallback jika Redis disconnect agar tidak mematikan service
      next();
    }
  };
};
