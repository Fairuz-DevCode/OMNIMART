import { describe, it, after, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";
import { generateAccessToken } from "../../../src/utils/token.js";

describe("Integration Test [04/12]: Customer Addresses & PostgreSQL State (/api/addresses)", () => {
  let testUser: any = null;
  let userToken: string = "";

  before(async () => {
    // Buat dummy customer di PostgreSQL untuk pengujian integrasi alamat
    testUser = await prisma.users.create({
      data: {
        name: "Address Tester",
        email: `address_tester_${Date.now()}@nexatest.com`,
        password: "$2a$10$dummyhashedpasswordforintegrationtesting12345",
        role: "user",
      },
    });
    userToken = generateAccessToken({ id: testUser.id, role: "user" });
  });

  after(async () => {
    if (testUser) {
      await prisma.addresses.deleteMany({ where: { user_id: testUser.id } });
      await prisma.users.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. GET /api/addresses wajib 401 Unauthorized jika diakses tanpa autentikasi", async () => {
    const res = await request(app).get("/api/addresses");
    assert.strictEqual(res.statusCode, 401);
  });

  it("2. GET /api/addresses dengan token valid mengembalikan daftar alamat dari PostgreSQL", async () => {
    const res = await request(app)
      .get("/api/addresses")
      .set("Authorization", `Bearer ${userToken}`);

    assert.strictEqual(res.statusCode, 200);
    const addresses = res.body.payload || res.body.data || res.body;
    assert.ok(Array.isArray(addresses));

    // 🔍 VERIFIKASI KE TABEL DATABASE:
    const dbAddresses = await prisma.addresses.findMany({
      where: { user_id: testUser.id },
    });
    assert.strictEqual(addresses.length, dbAddresses.length);
  });
});
