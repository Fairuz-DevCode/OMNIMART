import { Request, Response, NextFunction } from "express";
import redis from "../config/redis.js";

interface CachePayload {
  body: any;
  contentType?: string;
}

/**
 * Middleware untuk meng-cache response GET request menggunakan Redis.
 * @param ttlSeconds Durasi cache dalam detik (default 300 detik / 5 menit)
 * @param prefix Prefix kunci cache untuk mempermudah invalidasi
 */
export const cacheResponse = (ttlSeconds: number = 300, prefix: string = "cache") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = `${prefix}:${req.originalUrl || req.url}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed: CachePayload = JSON.parse(cached);
        res.setHeader("X-Cache", "HIT");
        if (parsed.contentType) {
          res.setHeader("Content-Type", parsed.contentType);
        }
        return res.send(parsed.body);
      }
    } catch (err) {
      console.warn("Redis cache read warning:", err);
    }

    res.setHeader("X-Cache", "MISS");

    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const contentType = res.getHeader("Content-Type") as string | undefined;
        const payloadToCache = JSON.stringify({
          body,
          contentType,
        });

        redis.set(cacheKey, payloadToCache, "EX", ttlSeconds).catch((err: any) => {
          console.warn("Redis cache write warning:", err);
        });
      }
      return originalSend(body);
    };

    next();
  };
};

/**
 * Middleware untuk meng-cache data user-spesifik seperti keranjang belanja per User ID
 */
export const cacheUserResponse = (ttlSeconds: number = 600, prefix: string = "cart") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
      return next();
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return next();
    }

    const cacheKey = `${prefix}:user:${userId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed: CachePayload = JSON.parse(cached);
        res.setHeader("X-Cache", "HIT");
        if (parsed.contentType) {
          res.setHeader("Content-Type", parsed.contentType);
        }
        return res.send(parsed.body);
      }
    } catch (err) {
      console.warn("Redis user cache read warning:", err);
    }

    res.setHeader("X-Cache", "MISS");

    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const contentType = res.getHeader("Content-Type") as string | undefined;
        const payloadToCache = JSON.stringify({
          body,
          contentType,
        });

        redis.set(cacheKey, payloadToCache, "EX", ttlSeconds).catch((err: any) => {
          console.warn("Redis user cache write warning:", err);
        });
      }
      return originalSend(body);
    };

    next();
  };
};

/**
 * Helper fungsi untuk menghapus cache berdasarkan pattern key menggunakan SCAN (non-blocking).
 * Mencegah server Redis freeze akibat penggunaan perintah KEYS di database besar.
 */
export const deleteKeysByPattern = async (pattern: string): Promise<void> => {
  try {
    const stream = redis.scanStream({
      match: pattern,
      count: 100,
    });

    stream.on("data", (keys: string[]) => {
      if (keys.length > 0) {
        const pipeline = redis.pipeline();
        keys.forEach((key) => pipeline.del(key));
        pipeline.exec().catch((err: any) => {
          console.warn("Redis pipeline del error:", err);
        });
      }
    });

    stream.on("error", (err: any) => {
      console.warn("Redis scanStream error:", err);
    });
  } catch (err) {
    console.warn("Error invalidating keys by pattern:", err);
  }
};

/**
 * Middleware untuk menghapus (invalidate) cache di Redis berdasarkan prefix.
 */
export const invalidateCache = (prefix: string) => {
  return async (_req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        deleteKeysByPattern(`${prefix}:*`);
      }
      return originalSend(body);
    };
    next();
  };
};

/**
 * Middleware untuk menghapus cache keranjang belanja spesifik milik user yang sedang aktif
 */
export const invalidateUserCache = (prefix: string = "cart") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = (req as any).user?.id;
        if (userId) {
          redis.del(`${prefix}:user:${userId}`).catch((err: any) => {
            console.warn("Redis user cache invalidate error:", err);
          });
        }
      }
      return originalSend(body);
    };
    next();
  };
};
