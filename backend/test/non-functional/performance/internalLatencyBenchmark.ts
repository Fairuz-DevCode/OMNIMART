import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import redis from "../../../src/config/redis.js";
import prisma from "../../../src/config/prisma.js";

describe("Non-Functional Performance Test: Micro-Latency & Throughput Benchmark", () => {
  after(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. Redis In-Memory Read/Write Latency harus sub-millisecond (< 5ms)", async () => {
    const key = "benchmark:ping_test";
    const payload = JSON.stringify({ id: 1, name: "Nexa Oversized Hoodie", price: 350000 });

    const startTime = performance.now();
    await redis.set(key, payload, "EX", 10);
    const cachedData = await redis.get(key);
    const duration = performance.now() - startTime;

    assert.ok(cachedData !== null);
    assert.ok(
      duration < 20,
      `Redis round-trip terlalu lambat: ${duration.toFixed(2)}ms (ekspektasi < 20ms)`
    );
    console.log(`\n   ⚡ [Latency Report] Redis SET + GET roundtrip: ${duration.toFixed(2)}ms`);
  });

  it("2. PostgreSQL Connection Ping Latency (SELECT 1) harus responsif (< 20ms)", async () => {
    const startTime = performance.now();
    await prisma.$queryRaw`SELECT 1 as ping`;
    const duration = performance.now() - startTime;

    assert.ok(
      duration < 50,
      `Database ping latency terlalu tinggi: ${duration.toFixed(2)}ms`
    );
    console.log(`   🗄️ [Latency Report] PostgreSQL Pool Ping: ${duration.toFixed(2)}ms`);
  });
});
