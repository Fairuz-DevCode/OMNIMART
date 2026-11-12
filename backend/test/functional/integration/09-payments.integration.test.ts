import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../../src/app.js";
import prisma from "../../../src/config/prisma.js";
import redis from "../../../src/config/redis.js";
import { generateAccessToken } from "../../../src/utils/token.js";

describe("Integration Test [09/12]: Payment Gateway & State Parity (/api/payments)", () => {
  const customerToken = generateAccessToken({ id: 2, email: "coba1@gmail.com", role: "customer" });

  after(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("1. POST /api/payments wajib ditolak tanpa token autentikasi (401)", async () => {
    const res = await request(app)
      .post("/api/payments")
      .send({ order_id: 1, payment_type: "bank_transfer" });
    assert.ok([401, 403].includes(res.statusCode));
  });

  it("2. GET /api/payments/order/:orderId diverifikasi langsung terhadap tabel payments di PostgreSQL", async () => {
    // 1. Ambil data aktual pembayaran langsung dari database PostgreSQL
    const dbPayment = await prisma.payments.findFirst({
      where: { order_id: 1 },
    });

    // 2. Request API dengan Bearer token pemilik pesanan
    const res = await request(app)
      .get("/api/payments/order/1")
      .set("Authorization", `Bearer ${customerToken}`);

    if (dbPayment) {
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.status, "success");
      // Assertion state parity database vs API
      assert.strictEqual(res.body.data.order_id, dbPayment.order_id);
      assert.strictEqual(res.body.data.payment_type, dbPayment.payment_type);
      assert.strictEqual(res.body.data.payment_url, dbPayment.payment_url);
    } else {
      assert.strictEqual(res.statusCode, 404);
    }
  });
});
