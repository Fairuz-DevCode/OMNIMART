import env from "./env.js";
import Redis from "ioredis";

export const redis = new (Redis as any)({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
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
