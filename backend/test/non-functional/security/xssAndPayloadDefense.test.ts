import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";

describe("Non-Functional Security Test: XSS, Payload Limit & Security Headers", () => {
  after(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. Respon HTTP wajib memuat Helmet Security Headers (nosniff & frameguard)", async () => {
    const res = await request(app).get("/api/health");
    assert.strictEqual(res.statusCode, 200);

    // Proteksi MIME sniffing
    assert.strictEqual(res.headers["x-content-type-options"], "nosniff");
    // Proteksi Clickjacking
    assert.ok(
      res.headers["x-frame-options"] === "SAMEORIGIN" ||
      res.headers["x-frame-options"] === "DENY"
    );
  });

  it("2. Payload JSON raksasa melebihi batas 1MB (Express limit) wajib ditolak 413 Payload Too Large", async () => {
    // Generate payload 1.5 Megabytes string dummy
    const largeString = "A".repeat(1.5 * 1024 * 1024);

    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(`{"email":"test@mail.com","password":"${largeString}"}`);

    assert.strictEqual(res.statusCode, 413);
  });

  it("3. Serangan XSS Payload (<script>alert(1)</script>) ditolak oleh validasi DTO atau disensor", async () => {
    const xssPayload = "<script>alert('XSS_ATTACK')</script>";
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: xssPayload,
        password: "Password123!",
      });

    // Validasi Zod menolak email berbentuk tag HTML (status 400 atau 422)
    assert.ok([400, 422].includes(res.statusCode));
  });
});
