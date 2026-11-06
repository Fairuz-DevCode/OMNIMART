import { Router, Request, Response } from "express";
import prisma from "../../config/prisma.js";
import redis from "../../config/redis.js";

const router = Router();

/**
 * Health check endpoint untuk Docker / Kubernetes / Uptime Monitoring.
 * Memeriksa status server, PostgreSQL via Prisma, Redis, dan Memory footprint.
 */
router.get("/health", async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const checks: {
    database: { status: "up" | "down"; latencyMs?: number; error?: string };
    redis: { status: "up" | "down"; latencyMs?: number; error?: string };
  } = {
    database: { status: "down" },
    redis: { status: "down" },
  };

  let isHealthy = true;

  // 1. Cek Koneksi Database PostgreSQL via Prisma
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1;`;
    checks.database = {
      status: "up",
      latencyMs: Date.now() - dbStart,
    };
  } catch (err: any) {
    isHealthy = false;
    checks.database = {
      status: "down",
      error: err.message || "Failed to query database",
    };
  }

  // 2. Cek Koneksi Redis
  const redisStart = Date.now();
  try {
    const pong = await redis.ping();
    if (pong === "PONG") {
      checks.redis = {
        status: "up",
        latencyMs: Date.now() - redisStart,
      };
    } else {
      isHealthy = false;
      checks.redis = {
        status: "down",
        error: "Unexpected ping response",
      };
    }
  } catch (err: any) {
    isHealthy = false;
    checks.redis = {
      status: "down",
      error: err.message || "Failed to connect to Redis",
    };
  }

  // 3. Info Memory & Uptime
  const memoryUsage = process.memoryUsage();
  const payload = {
    status: isHealthy ? "healthy" : "degraded",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    totalResponseTimeMs: Date.now() - startTime,
    checks,
    system: {
      memory: {
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
      nodeVersion: process.version,
    },
  };

  const statusCode = isHealthy ? 200 : 503;
  return res.status(statusCode).json(payload);
});

export default router;
