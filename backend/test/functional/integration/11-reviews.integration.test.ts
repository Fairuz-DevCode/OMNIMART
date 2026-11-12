import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";
import { generateAccessToken } from "../../../src/utils/token.js";

describe("Integration Test [11/12]: Product Reviews & Mutasi Database (/api/products/:id/reviews)", () => {
  const customerToken = generateAccessToken({ id: 2, email: "coba1@gmail.com", role: "customer" });
  let createdReviewId: number | null = null;

  after(async () => {
    // Bersihkan review uji coba dari database
    if (createdReviewId) {
      await prisma.product_reviews.deleteMany({
        where: { id: createdReviewId },
      });
    }
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. GET /api/products/1/reviews diverifikasi langsung dengan jumlah baris product_reviews di PostgreSQL", async () => {
    // 1. Hitung jumlah ulasan riil produk 1 di database
    const dbReviewCount = await prisma.product_reviews.count({
      where: { product_id: 1 },
    });

    const res = await request(app).get("/api/products/1/reviews");
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, "success");
    // Assert array reviews sesuai persis dengan row database
    assert.strictEqual(res.body.data.reviews.length, dbReviewCount);
  });

  it("2. POST /api/products/1/reviews membuat ulasan baru dan memvalidasi persistensi baris di PostgreSQL", async () => {
    const testComment = `Integration review test at ${Date.now()}`;
    const res = await request(app)
      .post("/api/products/1/reviews")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ rating: 5, comment: testComment });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.status, "success");
    createdReviewId = res.body.data.id;

    // Direct Database Query: Pastikan data benar-benar tersimpan di tabel PostgreSQL
    const insertedInDb = await prisma.product_reviews.findUnique({
      where: { id: createdReviewId! },
    });

    assert.ok(insertedInDb, "Baris review wajib ditemukan di database PostgreSQL");
    assert.strictEqual(insertedInDb.rating, 5);
    assert.strictEqual(insertedInDb.comment, testComment);
    assert.strictEqual(insertedInDb.user_id, 2);
  });

  it("3. POST /api/products/1/reviews menolak ulasan dari guest tanpa token (401)", async () => {
    const res = await request(app)
      .post("/api/products/1/reviews")
      .send({ rating: 5, comment: "Ulasan guest ilegal" });
    assert.ok([401, 403].includes(res.statusCode));
  });
});
