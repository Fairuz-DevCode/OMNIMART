import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import pool from "../../src/config/db.js";

describe("SHIPPING API INTEGRATION TESTS", () => {
  let userToken;
  let adminToken;
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
       VALUES ('testuser_shipping@example.com', 'password123', 'Test Shipping User', '08123456784', 'user')
       RETURNING id;`
    );
    userId = userRes.rows[0].id;

    userToken = jwt.sign(
      { id: userId, email: "testuser_shipping@example.com", role: "user" },
      process.env.JWT_ACCESS_SECRET || "Acces89",
      { expiresIn: "1h" }
    );

    adminToken = jwt.sign(
      { id: 999, email: "admin_shipping@example.com", role: "admin" },
      process.env.JWT_ACCESS_SECRET || "Acces89",
      { expiresIn: "1h" }
    );

    // 2. Create address for user
    const addrRes = await pool.query(
      `INSERT INTO addresses (user_id, label, phone, street_address, city, country, postal_code)
       VALUES ($1, 'Rumah', '08123456784', 'Jl. Mawar No. 123', 'Surabaya', 'Indonesia', '60293')
       RETURNING id;`,
      [userId]
    );
    addressId = addrRes.rows[0].id;

    // 3. Create product category & product & variant
    const catRes = await pool.query(
      `INSERT INTO categories (name, slug) VALUES ('Shipping Apparel', 'shipping-apparel') RETURNING id;`
    );
    categoryId = catRes.rows[0].id;

    const prodRes = await pool.query(
      `INSERT INTO products (category_id, sku, name, slug, description, price, img_url)
       VALUES ($1, 'SKU-TEST-SHIPPING', 'Test Shipping Hoodie', 'test-shipping-hoodie', 'Comfortable streetwear hoodie for shipping test', 450000, 'https://example.com/shipping-hoodie.jpg')
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
        quantity: 1,
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

    // 6. Set payment notification to settlement so order status is 'paid'
    await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        order_id: createdOrderId,
        payment_type: "gopay",
      });

    await request(app)
      .post("/api/payments/notification")
      .send({
        order_id: orderNumber,
        transaction_status: "settlement",
        payment_type: "gopay",
      });
  });

  afterAll(async () => {
    if (userId) {
      await pool.query(`DELETE FROM shippings WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1);`, [userId]);
      await pool.query(`DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1);`, [userId]);
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

  it("PATCH /api/shippings/order/:orderId - Update shipping status as Admin", async () => {
    const res = await request(app)
      .patch(`/api/shippings/order/${createdOrderId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courier: "JNE",
        tracking_number: "JNE123456789ID",
        shipping_status: "shipped",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.courier).toBe("JNE");
    expect(res.body.data.tracking_number).toBe("JNE123456789ID");
  });

  it("GET /api/shippings/order/:orderId - Get shipping detail & tracking info", async () => {
    const res = await request(app)
      .get(`/api/shippings/order/${createdOrderId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.courier).toBe("JNE");
    expect(res.body.data.tracking_number).toBe("JNE123456789ID");
  });

  it("PATCH /api/shippings/order/:orderId/complete - Customer confirms order received", async () => {
    const res = await request(app)
      .patch(`/api/shippings/order/${createdOrderId}/complete`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.shipping_status).toBe("delivered");
    expect(res.body.data.order_status).toBe("completed");
  });
});
