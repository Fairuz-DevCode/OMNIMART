import { describe, it, after, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";

describe("Integration Test [02/12]: Authentication Lifecycle & Database Mutation (/api/auth)", () => {
  let createdUserId: number | null = null;
  const uniqueEmail = `test_integration_${Date.now()}@nexatest.com`;

  before(async () => {
    // Reset rate limiter keys untuk IP pengujian
    const authKeys = await redis.keys("auth_ratelimit:*");
    if (authKeys.length > 0) {
      await redis.del(...authKeys);
    }
  });

  after(async () => {
    // Cleanup data uji coba di database
    if (createdUserId) {
      await prisma.refresh_tokens.deleteMany({ where: { user_id: createdUserId } });
      await prisma.audit_logs.deleteMany({ where: { user_id: createdUserId } });
      await prisma.users.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. POST /api/auth/register sukses 201 & memverifikasi mutasi nyata di PostgreSQL", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test Customer",
        email: uniqueEmail,
        password: "ValidPassword123!",
      });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.status, "success");
    createdUserId = res.body.payload?.user?.id;
    assert.ok(createdUserId);

    // 🔍 VERIFIKASI LANGSUNG KE TABEL DATABASE POSTGRESQL:
    const dbUser = await prisma.users.findUnique({
      where: { email: uniqueEmail },
    });
    assert.ok(dbUser !== null, "User gagal tersimpan di tabel database users!");
    assert.strictEqual(dbUser.email, uniqueEmail);
    assert.strictEqual(dbUser.role, "user");
    assert.ok(
      dbUser.password.startsWith("$2"),
      "Password di database wajib terenkripsi bcrypt, bukan plaintext!"
    );

    // 🔍 VERIFIKASI REFRESH TOKEN TERSIMPAN DI TABEL DATABASE:
    const dbToken = await prisma.refresh_tokens.findFirst({
      where: { user_id: createdUserId },
    });
    assert.ok(dbToken !== null, "Refresh token tidak tersimpan di tabel refresh_tokens!");
  });

  it("2. POST /api/auth/login sukses 200 & mencatat jejak di tabel audit_logs", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: uniqueEmail,
        password: "ValidPassword123!",
      });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, "success");
    assert.ok(res.body.payload?.accessToken);

    // 🔍 VERIFIKASI AUDIT LOG RECORD TERSIMPAN DI TABEL AUDIT_LOGS:
    const auditRecord = await prisma.audit_logs.findFirst({
      where: { path: "/api/auth/login" },
      orderBy: { created_at: "desc" },
    });
    assert.ok(auditRecord !== null, "Aksi login gagal tercatat di tabel audit_logs!");
    assert.strictEqual(auditRecord.path, "/api/auth/login");
  });

  it("3. POST /api/auth/register gagal 422 jika body tidak sesuai Zod schema", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "invalid-email" });

    assert.strictEqual(res.statusCode, 422);
    assert.strictEqual(res.body.status, "fail");
  });

  it("4. POST /api/auth/login gagal 401 jika kredensial tidak ditemukan", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "nonexistent_tester_999@domain.com",
        password: "WrongPassword123!",
      });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.status, "fail");
  });
});
