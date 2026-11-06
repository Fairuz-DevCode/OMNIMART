import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import pool from "../../src/config/db.js";

describe("CART API INTEGRATION TESTS", () => {
  let userToken;
  let userId;
  let categoryId;
  let productId;
  let variantId;
  let cartItemId;

  beforeAll(async () => {
    // 1. Create mock user
    const userRes = await pool.query(
      `INSERT INTO users (email, password, name, phone, role) 
       VALUES ('testuser_cart@example.com', 'password123', 'Test Cart User', '08123456781', 'user')
       RETURNING id;`
    );
    userId = userRes.rows[0].id;

    userToken = jwt.sign(
      { id: userId, email: "testuser_cart@example.com", role: "user" },
      process.env.JWT_ACCESS_SECRET || "Acces89",
      { expiresIn: "1h" }
    );

    // 2. Create product category & product & variant
    const catRes = await pool.query(
      `INSERT INTO categories (name, slug) VALUES ('Cart Apparel', 'cart-apparel') RETURNING id;`
    );
    categoryId = catRes.rows[0].id;

    const prodRes = await pool.query(
      `INSERT INTO products (category_id, sku, name, slug, description, price, img_url)
       VALUES ($1, 'SKU-TEST-CART', 'Test Cart Hoodie', 'test-cart-hoodie', 'Comfortable streetwear hoodie for cart test', 450000, 'https://example.com/cart-hoodie.jpg')
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
  });

  afterAll(async () => {
    if (userId) {
      await pool.query(`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1);`, [userId]);
      await pool.query(`DELETE FROM carts WHERE user_id = $1;`, [userId]);
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

  it("POST /api/cart/items - Add item to cart successfully", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        product_id: productId,
        product_variant_id: variantId,
        quantity: 2,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.quantity).toBe(2);
    cartItemId = res.body.data.id;
  });

  it("GET /api/carts - Fetch user cart successfully", async () => {
    const res = await request(app)
      .get("/api/carts")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.total_price).toBe(900000);
  });

  it("PATCH /api/carts/items/:id - Update cart item quantity", async () => {
    const res = await request(app)
      .patch(`/api/carts/items/${cartItemId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ quantity: 3 });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.quantity).toBe(3);
  });

  it("POST /api/cart/items - Exceed stock limit validation error", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        product_id: productId,
        product_variant_id: variantId,
        quantity: 100,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe("fail");
    expect(res.body.message).toBe("Requested quantity exceeds available stock");
  });
});
