import { describe, it, after, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";
import { generateAccessToken } from "../../../src/utils/token.js";

describe("Integration Test [08/12]: Orders, Checkout Engine & DB Consistency (/api/orders)", () => {
  let testUser: any = null;
  let userToken: string = "";

  before(async () => {
    testUser = await prisma.users.create({
      data: {
        name: "Order Tester",
        email: `order_tester_${Date.now()}@nexatest.com`,
        password: "$2a$10$dummyhashedpasswordforintegrationtesting12345",
        role: "user",
      },
    });
    userToken = generateAccessToken({ id: testUser.id, role: "user" });
  });

  after(async () => {
    if (testUser) {
      await prisma.orders.deleteMany({ where: { user_id: testUser.id } });
      await prisma.users.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. GET /api/orders wajib 401 jika diakses tanpa login", async () => {
    const res = await request(app).get("/api/orders");
    assert.strictEqual(res.statusCode, 401);
  });

  it("2. GET /api/orders dengan token valid mengembalikan daftar order yang sinkron dengan PostgreSQL", async () => {
    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${userToken}`);

    assert.strictEqual(res.statusCode, 200);
    const orders = res.body.payload || res.body.data || [];
    assert.ok(Array.isArray(orders));

    // 🔍 VERIFIKASI KE TABEL DATABASE POSTGRESQL:
    const dbOrders = await prisma.orders.findMany({
      where: { user_id: testUser.id },
    });
    assert.strictEqual(orders.length, dbOrders.length);
  });

  it("3. POST /api/orders wajib ditolak jika tanpa token autentikasi atau Idempotency-Key", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ address_id: 1, shipping_cost: 10000 });
    assert.ok([401, 403].includes(res.statusCode));
  });

  it("4. GET /api/orders/999 (BOLA/IDOR protection) menolak akses order orang lain tanpa token", async () => {
    const res = await request(app).get("/api/orders/999");
    assert.strictEqual(res.statusCode, 401);
  });
});
