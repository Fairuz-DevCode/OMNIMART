import { describe, it, after, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";
import { generateAccessToken } from "../../../src/utils/token.js";

describe("Integration Test [03/12]: User Profile & PostgreSQL State (/api/users)", () => {
  let testUser: any = null;
  let userToken: string = "";

  before(async () => {
    testUser = await prisma.users.create({
      data: {
        name: "Profile Tester",
        email: `profile_tester_${Date.now()}@nexatest.com`,
        password: "$2a$10$dummyhashedpasswordforintegrationtesting12345",
        role: "user",
      },
    });
    userToken = generateAccessToken({ id: testUser.id, role: "user" });
  });

  after(async () => {
    if (testUser) {
      await prisma.users.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. GET /api/users/me wajib 401 jika request tidak membawa Authorization header", async () => {
    const res = await request(app).get("/api/users/me");
    assert.strictEqual(res.statusCode, 401);
  });

  it("2. GET /api/users/me dengan Bearer token mengembalikan data profil yang sama persis dengan PostgreSQL", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${userToken}`);

    assert.strictEqual(res.statusCode, 200);
    const profile = res.body.payload?.user || res.body.payload || res.body.data;
    assert.ok(profile);
    assert.strictEqual(profile.email, testUser.email);
    assert.strictEqual(profile.name, testUser.name);

    // 🔍 VERIFIKASI LANGSUNG DENGAN DATABASE:
    const dbUser = await prisma.users.findUnique({ where: { id: testUser.id } });
    assert.ok(dbUser !== null);
    assert.strictEqual(profile.email, dbUser.email);
  });

  it("3. PUT /api/users/me/change-password wajib menolak request tanpa token", async () => {
    const res = await request(app)
      .put("/api/users/me/change-password")
      .send({ currentPassword: "Old", newPassword: "New" });
    assert.ok([401, 403].includes(res.statusCode));
  });
});
