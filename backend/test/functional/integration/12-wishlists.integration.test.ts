import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";
import { generateAccessToken } from "../../../src/utils/token.js";

describe("Integration Test [12/12]: Customer Wishlist State & Database Parity (/api/wishlist)", () => {
  const customerToken = generateAccessToken({ id: 2, email: "coba1@gmail.com", role: "customer" });
  const testProductId = 1;

  after(async () => {
    // Bersihkan wishlist test user untuk produk 1 agar idempotent
    await prisma.wishlists.deleteMany({
      where: { user_id: 2, product_id: testProductId },
    });
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. GET /api/wishlist wajib ditolak 401 Unauthorized tanpa token", async () => {
    const res = await request(app).get("/api/wishlist");
    assert.strictEqual(res.statusCode, 401);
  });

  it("2. POST /api/wishlist/toggle memutasi tabel wishlists di PostgreSQL (Add & Remove)", async () => {
    // Pastikan status awal bersih di DB
    await prisma.wishlists.deleteMany({
      where: { user_id: 2, product_id: testProductId },
    });

    // 1. Toggle ADD
    const addRes = await request(app)
      .post("/api/wishlist/toggle")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId: testProductId });

    assert.strictEqual(addRes.statusCode, 200);
    assert.strictEqual(addRes.body.data.inWishlist, true);

    // Verifikasi Database: Baris harus ada di PostgreSQL
    const dbItemAdded = await prisma.wishlists.findFirst({
      where: { user_id: 2, product_id: testProductId },
    });
    assert.ok(dbItemAdded, "Wishlist record wajib tersimpan di tabel PostgreSQL");

    // Verifikasi GET API membaca dari data tersebut
    const getRes = await request(app)
      .get("/api/wishlist")
      .set("Authorization", `Bearer ${customerToken}`);
    assert.strictEqual(getRes.statusCode, 200);
    const itemInGet = getRes.body.data.find((item: any) => item.product_id === testProductId);
    assert.ok(itemInGet, "Item wishlist harus muncul di respons GET");

    // 2. Toggle REMOVE
    const removeRes = await request(app)
      .post("/api/wishlist/toggle")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId: testProductId });

    assert.strictEqual(removeRes.statusCode, 200);
    assert.strictEqual(removeRes.body.data.inWishlist, false);

    // Verifikasi Database: Baris harus terhapus dari PostgreSQL
    const dbItemRemoved = await prisma.wishlists.findFirst({
      where: { user_id: 2, product_id: testProductId },
    });
    assert.strictEqual(dbItemRemoved, null, "Wishlist record wajib terhapus dari tabel PostgreSQL");
  });
});
