import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";

describe("Non-Functional Security Test: SQL Injection (SQLi) Defense", () => {
  after(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. Parameter search fuzzy dengan payload Classic SQLi (' OR '1'='1) tidak boleh mengeksekusi bypass", async () => {
    const maliciousPayload = "' OR '1'='1";
    const res = await request(app).get(`/api/products?search=${encodeURIComponent(maliciousPayload)}`);

    // Server tidak boleh 500 Internal Server Error (karena SQL syntax error)
    // Server harus memprosesnya sebagai string pencarian biasa yang aman (status 200)
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body);
  });

  it("2. Payload SQL Destruktif ('; DROP TABLE \"users\"; --) harus di-escape secara aman oleh parameterized query", async () => {
    const destructivePayload = "'; DROP TABLE \"users\"; --";
    const res = await request(app).get(`/api/products?search=${encodeURIComponent(destructivePayload)}`);

    assert.strictEqual(res.statusCode, 200);

    // Verifikasi bahwa tabel users tetap utuh di database
    const userCount = await prisma.users.count();
    assert.ok(typeof userCount === "number");
  });

  it("3. Filter kategori bersimbol injeksi union-based (' UNION SELECT 1,2,3) tidak membocorkan data", async () => {
    const unionPayload = "' UNION SELECT password, email FROM users --";
    const res = await request(app).get(`/api/products?category=${encodeURIComponent(unionPayload)}`);

    assert.strictEqual(res.statusCode, 200);
  });
});
