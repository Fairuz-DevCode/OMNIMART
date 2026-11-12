import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";
import { generateAccessToken } from "../../../src/utils/token.js";

describe("Integration Test [10/12]: Shipping Logistics & Database Parity (/api/shippings)", () => {
  const customerToken = generateAccessToken({ id: 2, email: "coba1@gmail.com", role: "customer" });

  after(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. POST /api/shippings/calculate mengembalikan estimasi ongkir dinamis", async () => {
    const res = await request(app)
      .post("/api/shippings/calculate")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ destination_city: "Jakarta Selatan", weight: 1200, courier: "JNE" });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, "success");
    assert.ok(typeof res.body.data.cost === "number");
    assert.strictEqual(res.body.data.courier, "JNE");
  });

  it("2. GET /api/shippings/order/1 diverifikasi langsung terhadap baris shippings di PostgreSQL", async () => {
    // 1. Ambil data pengiriman aktual dari database
    const dbShipping = await prisma.shippings.findFirst({
      where: { order_id: 1 },
    });

    // 2. Request API detail logistik dengan token pemilik order
    const res = await request(app)
      .get("/api/shippings/order/1")
      .set("Authorization", `Bearer ${customerToken}`);

    if (dbShipping) {
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.status, "success");
      // Cek state parity database vs respons API
      assert.strictEqual(res.body.data.order_id, dbShipping.order_id);
      assert.strictEqual(res.body.data.tracking_number, dbShipping.tracking_number);
    } else {
      assert.strictEqual(res.statusCode, 404);
    }
  });

  it("3. PATCH /api/shippings/order/1 ditolak 403 Forbidden bila bukan Admin", async () => {
    const res = await request(app)
      .patch("/api/shippings/order/1")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ courier: "JNE", tracking_number: "RESI999", shipping_status: "shipped" });

    assert.strictEqual(res.statusCode, 403);
  });
});
