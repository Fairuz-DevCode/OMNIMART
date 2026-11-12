import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";

describe("Non-Functional Security Test: Rate Limiting & Brute-Force Defense", () => {
  after(async () => {
    // Bersihkan rate limit keys agar tidak mengganggu test suite lain
    const keys = await redis.keys("ratelimit:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. Request ke endpoint API harus menyertakan header RateLimit", async () => {
    const res = await request(app).get("/api/health");
    assert.strictEqual(res.statusCode, 200);

    // Memeriksa header RateLimit standar RFC 6585
    const limitHeader = res.headers["ratelimit-limit"] || res.headers["x-ratelimit-limit"];
    assert.ok(limitHeader !== undefined);
  });

  it("2. Endpoint autentikasi login memiliki proteksi rate limiting per IP", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "rate_limit_test@mail.com", password: "pwd" });

    // Header limit login lebih ketat (15 req/15m)
    const limitHeader = res.headers["ratelimit-limit"] || res.headers["x-ratelimit-limit"];
    assert.ok(limitHeader !== undefined);
  });
});
