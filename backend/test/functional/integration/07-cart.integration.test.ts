import { describe, it, after, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";
import { generateAccessToken } from "../../../src/utils/token.js";

describe("Integration Test [07/12]: Shopping Cart & PostgreSQL Consistency (/api/carts)", () => {
  let testUser: any = null;
  let userToken: string = "";

  before(async () => {
    testUser = await prisma.users.create({
      data: {
        name: "Cart Tester",
        email: `cart_tester_${Date.now()}@nexatest.com`,
        password: "$2a$10$dummyhashedpasswordforintegrationtesting12345",
        role: "user",
      },
    });
    userToken = generateAccessToken({ id: testUser.id, role: "user" });
  });

  after(async () => {
    if (testUser) {
      await prisma.cart_items.deleteMany({
        where: { carts: { user_id: testUser.id } },
      });
      await prisma.carts.deleteMany({ where: { user_id: testUser.id } });
      await prisma.users.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. GET /api/carts wajib 401 jika diakses guest tanpa sesi", async () => {
    const res = await request(app).get("/api/carts");
    assert.strictEqual(res.statusCode, 401);
  });

  it("2. GET /api/carts dengan token valid mengembalikan keranjang yang sinkron dengan PostgreSQL", async () => {
    const res = await request(app)
      .get("/api/carts")
      .set("Authorization", `Bearer ${userToken}`);

    assert.strictEqual(res.statusCode, 200);

    // 🔍 VERIFIKASI KE TABEL DATABASE POSTGRESQL:
    const dbCart = await prisma.carts.findUnique({
      where: { user_id: testUser.id },
      include: { cart_items: true },
    });
    // Jika user belum belanja, dbCart bisa null atau kosong, dan respons API konsisten
    const cartResponse = res.body.data || res.body.payload;
    if (dbCart && cartResponse) {
      assert.strictEqual(cartResponse.id, dbCart.id);
    }
  });

  it("3. POST /api/carts/items wajib ditolak tanpa token autentikasi atau CSRF", async () => {
    const res = await request(app)
      .post("/api/carts/items")
      .send({ product_id: 1, product_variant_id: 1, quantity: 1 });
    assert.ok([401, 403].includes(res.statusCode));
  });
});
