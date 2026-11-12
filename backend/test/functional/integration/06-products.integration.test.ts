import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";

describe("Integration Test [06/12]: Product Catalog, PostgreSQL Parity & Redis Cache State (/api/products)", () => {
  after(async () => {
    // Invalidate test cache
    const keys = await redis.keys("products:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. GET /api/products mengembalikan data yang sinkron dengan PostgreSQL & menyimpan cache di Redis", async () => {
    // 1. First Request: Menghasilkan Cache MISS & menyimpan hasil ke Redis
    const res1 = await request(app).get("/api/products?page=1&limit=4");
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.body.status, "success");

    const apiProducts = res1.body.payload?.products || res1.body.payload;
    assert.ok(Array.isArray(apiProducts));

    // 🔍 VERIFIKASI LANGSUNG DENGAN RECORD DI POSTGRESQL:
    const dbProducts = await prisma.products.findMany({
      where: { deleted_at: null },
      orderBy: { id: "asc" },
      take: 4,
    });
    assert.strictEqual(apiProducts.length, dbProducts.length);
    if (dbProducts.length > 0) {
      assert.strictEqual(apiProducts[0].id, dbProducts[0].id);
      assert.strictEqual(apiProducts[0].slug, dbProducts[0].slug);
    }

    // Beri jeda 50ms untuk async redis.set
    await new Promise((r) => setTimeout(r, 50));

    // 🔍 VERIFIKASI CACHE TERBENTUK DI DALAM RAM REDIS:
    const redisKeys = await redis.keys("products:*");
    assert.ok(
      redisKeys.length > 0,
      "Redis Cache-Aside gagal menyimpan respon katalog produk di memori RAM!"
    );

    // 2. Second Request: Harus dilayani dari Redis dengan header X-Cache: HIT
    const res2 = await request(app).get("/api/products?page=1&limit=4");
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(
      res2.headers["x-cache"],
      "HIT",
      "Request kedua wajib dilayani langsung dari Cache RAM Redis (X-Cache: HIT)!"
    );
  });

  it("2. POST /api/products wajib ditolak jika tanpa token admin (RBAC protection)", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ name: "Illegal Product" });
    assert.ok([401, 403].includes(res.statusCode));
  });
});
