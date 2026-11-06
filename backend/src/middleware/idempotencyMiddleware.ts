import { Request, Response, NextFunction } from "express";
import redis from "../config/redis.js";
import { AppError } from "../utils/appError.js";

/**
 * Middleware Idempotency menggunakan header `Idempotency-Key` atau `X-Idempotency-Key`.
 * Mencegah duplikasi aksi critical (misal checkout order, initiate payment, refund) saat jaringan retry / user double click.
 * 
 * @param ttlSeconds Masa aktif key di Redis (default 120 detik / 2 menit)
 */
export const idempotency = (ttlSeconds: number = 120) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Hanya berlaku untuk mutasi data (POST, PUT, PATCH, DELETE)
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    const idempotencyKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;

    // Jika client tidak menyertakan idempotency key, lewati (opsional untuk backward compatibility)
    if (!idempotencyKey) {
      return next();
    }

    const redisKey = `idempotency:${idempotencyKey}`;

    try {
      // SETNX (SET if Not eXists) untuk memastikan atomic lock
      const acquired = await redis.set(redisKey, JSON.stringify({ status: "processing" }), "EX", ttlSeconds, "NX");

      if (!acquired) {
        // Key sudah pernah dikirim sebelumnya
        const existingRecord = await redis.get(redisKey);
        if (existingRecord) {
          const parsed = JSON.parse(existingRecord);
          if (parsed.status === "completed") {
            // Kembalikan response yang sama persis seperti request pertama
            res.setHeader("X-Idempotent-Replay", "true");
            if (parsed.headers?.["content-type"]) {
              res.setHeader("Content-Type", parsed.headers["content-type"]);
            }
            return res.status(parsed.statusCode || 200).send(parsed.body);
          } else {
            // Masih dalam proses eksekusi oleh request paralel sebelumnya
            return next(new AppError("A request with this idempotency key is currently being processed. Please wait.", 409));
          }
        }
      }

      // Intersep response res.send untuk menyimpan hasil eksekusi sukses ke Redis
      const originalSend = res.send.bind(res);
      res.send = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const payload = {
            status: "completed",
            statusCode: res.statusCode,
            headers: {
              "content-type": res.getHeader("Content-Type"),
            },
            body,
          };
          redis.set(redisKey, JSON.stringify(payload), "EX", ttlSeconds).catch((err: any) => {
            console.warn("Failed to save idempotent response:", err);
          });
        } else {
          // Jika gagal (error 4xx/5xx), hapus lock agar user bisa retry dengan key yang sama
          redis.del(redisKey).catch((err: any) => {
            console.warn("Failed to clear failed idempotent lock:", err);
          });
        }
        return originalSend(body);
      };

      next();
    } catch (err) {
      console.warn("Idempotency middleware error, continuing without idempotency lock:", err);
      next();
    }
  };
};
