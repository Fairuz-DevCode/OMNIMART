import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import pool from "../../src/config/db.js";

describe("PAYMENT API INTEGRATION TESTS", () => {
  let userToken;
  let userId;
  let addressId;
  let categoryId;
  let productId;
  let variantId;
  let createdOrderId;
  let orderNumber;

  beforeAll(async () => {
    // 1. Create mock user
    const userRes = await pool.query(
      `INSERT INTO users (email, password, name, phone, role) 
       VALUES ('testuser_payment@example.com', 'password123', 'Test Payment User', '08123456783', 'user')
       RETURNING id;`
    );
    userId = userRes.rows[0].id;

    userToken = jwt.sign(
      { id: userId, email: "testuser_payment@example.com", role: "user" },
      process.env.JWT_ACCESS_SECRET || "Acces89",
      { expiresIn: "1h" }
    );

    // 2. Create address for user
    const addrRes = await pool.query(
      `INSERT INTO addresses (user_id, label, phone, street_address, city, country, postal_code)
       VALUES ($1, 'Rumah', '08123456783', 'Jl. Mawar No. 123', 'Surabaya', 'Indonesia', '60293')
       RETURNING id;`,
      [userId]
    );
    addressId = addrRes.rows[0].id;

    // 3. Create product category & product & variant
    const catRes = await pool.query(
      `INSERT INTO categories (name, slug) VALUES ('Payment Apparel', 'payment-apparel') RETURNING id;`
    );
    categoryId = catRes.rows[0].id;

    const prodRes = await pool.query(
      `INSERT INTO products (category_id, sku, name, slug, description, price, img_url)
       VALUES ($1, 'SKU-TEST-PAYMENT', 'Test Payment Hoodie', 'test-payment-hoodie', 'Comfortable streetwear hoodie for payment test', 450000, 'https://example.com/payment-hoodie.jpg')
       RETURNING id;`,
      [categoryId]
    );
    productId = prodRes.rows[0].id;

    const varRes = await pool.query(
      `INSERT INTO product_variants (product_id, size, stock)
       VALUES ($1, 'L', 50)
       RETURNING id;`,
      [productId]
    );
    variantId = varRes.rows[0].id;

    // 4. Create cart & item
    await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        product_id: productId,
        product_variant_id: variantId,
        quantity: 2,
      });

    // 5. Create order
    const orderRes = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        address_id: addressId,
        shipping_cost: 20000,
      });

    createdOrderId = orderRes.body.data.id;
    orderNumber = orderRes.body.data.order_number;
  });

  afterAll(async () => {
    if (userId) {
      await pool.query(`DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1);`, [userId]);
      await pool.query(`DELETE FROM shippings WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1);`, [userId]);
      await pool.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1);`, [userId]);
      await pool.query(`DELETE FROM orders WHERE user_id = $1;`, [userId]);
      await pool.query(`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1);`, [userId]);
      await pool.query(`DELETE FROM carts WHERE user_id = $1;`, [userId]);
      await pool.query(`DELETE FROM addresses WHERE user_id = $1;`, [userId]);
      await pool.query(`DELETE FROM users WHERE id = $1;`, [userId]);
    }
    if (productId) {
      await pool.query(`DELETE FROM product_variants WHERE product_id = $1;`, [productId]);
      await pool.query(`DELETE FROM products WHERE id = $1;`, [productId]);
    }
    if (categoryId) {
      await pool.query(`DELETE FROM categories WHERE id = $1;`, [categoryId]);
    }
  });

  it("POST /api/payments - Create payment transaction with Midtrans Sandbox", async () => {
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        order_id: createdOrderId,
        payment_type: "gopay",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.order_id).toBe(createdOrderId);
    expect(res.body.data.transaction_status).toBe("pending");
    expect(res.body.data).toHaveProperty("payment_url");
  });

  it("GET /api/payments/order/:orderId - Fetch payment detail", async () => {
    const res = await request(app)
      .get(`/api/payments/order/${createdOrderId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.order_id).toBe(createdOrderId);
  });

  it("POST /api/payments/notification - Handle Midtrans Webhook notification (Settlement)", async () => {
    const res = await request(app)
      .post("/api/payments/notification")
      .send({
        order_id: orderNumber,
        transaction_status: "settlement",
        payment_type: "gopay",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");

    // Verify order status updated to 'paid'
    const orderRes = await request(app)
      .get(`/api/orders/${createdOrderId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(orderRes.body.data.status).toBe("paid");
  });
});
