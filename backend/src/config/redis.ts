import dotenv from "dotenv";
dotenv.config();

import Redis from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const redis = new (Redis as any)({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  retryStrategy(times: number) {
    // Retry interval max 2 detik
    return Math.min(times * 100, 2000);
  },
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
  console.log("⚡ Connected to Redis successfully");
});

redis.on("error", (err: Error) => {
  console.warn("⚠️ Redis connection warning:", err.message);
});

export default redis;
