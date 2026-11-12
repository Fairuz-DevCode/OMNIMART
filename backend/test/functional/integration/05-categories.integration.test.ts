import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";

describe("Integration Test [05/12]: Product Categories & Database Parity (/api/categories)", () => {
  after(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. GET /api/categories harus publik dan sinkron dengan jumlah record di PostgreSQL", async () => {
    const res = await request(app).get("/api/categories");
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, "success");

    const categoriesFromApi = res.body.payload?.categories || res.body.payload;
    assert.ok(Array.isArray(categoriesFromApi));

    // 🔍 VERIFIKASI KE TABEL DATABASE POSTGRESQL:
    const dbCategoryCount = await prisma.categories.count({
      where: { deleted_at: null },
    });
    assert.strictEqual(
      categoriesFromApi.length,
      dbCategoryCount,
      "Jumlah kategori dari API harus sama persis dengan record aktif di PostgreSQL!"
    );

    if (categoriesFromApi.length > 0) {
      // Pastikan slug dan nama sesuai data di DB
      const sampleApiCat = categoriesFromApi[0];
      const sampleDbCat = await prisma.categories.findUnique({
        where: { id: sampleApiCat.id },
      });
      assert.ok(sampleDbCat !== null);
      assert.strictEqual(sampleApiCat.slug, sampleDbCat.slug);
    }
  });
});
