import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";

describe("Integration Test [01/12]: Health Check & System Probes (/api/health)", () => {
  after(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. GET /api/health mengembalikan status 'healthy', uptime, dan metrik V8 memory", async () => {
    const res = await request(app).get("/api/health");
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, "healthy");
    assert.ok(res.body.timestamp);
    assert.ok(res.body.system);
    assert.ok(res.body.uptimeSeconds !== undefined);
  });
});
