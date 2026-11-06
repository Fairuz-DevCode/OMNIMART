import "dotenv/config";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import pool from "../../src/config/db.js";

describe("PRODUCT API INTEGRATION TESTS", () => {
  let adminToken;
  let categoryId;
  let createdProduct;

  beforeAll(async () => {
    adminToken = jwt.sign(
      { id: 1, email: "admin@example.com", role: "admin" },
      process.env.JWT_ACCESS_SECRET || "Acces89",
      { expiresIn: "1h" },
    );

    // Clean up leftover test data
    await pool.query(
      `DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE sku LIKE 'TEST-%')`,
    );
    await pool.query(
      `DELETE FROM products WHERE sku LIKE 'TEST-%'`,
    );
    await pool.query(
      `DELETE FROM categories WHERE slug = 'test-product-category'`,
    );

    // Create a test category to use for product creation
    const catRes = await pool.query(
      `INSERT INTO categories (name, slug) VALUES ('Test Product Category', 'test-product-category') RETURNING id, name, slug;`,
    );
    categoryId = catRes.rows[0].id;
  });

  afterAll(async () => {
    if (createdProduct && createdProduct.id) {
      await pool.query(
        `DELETE FROM product_variants WHERE product_id = $1`,
        [createdProduct.id],
      );
      await pool.query(
        `DELETE FROM products WHERE id = $1`,
        [createdProduct.id],
      );
    }
    if (categoryId) {
      await pool.query(
        `DELETE FROM categories WHERE id = $1`,
        [categoryId],
      );
    }
  });

  // ==========================================
  // CREATE PRODUCT
  // ==========================================
  describe("POST /api/product", () => {
    it("should create a product under a category", async () => {
      const res = await request(app)
        .post("/api/product")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          category_id: categoryId,
          sku: `TEST-PROD-${Date.now()}`,
          name: "Test Integration Product",
          slug: "test-integration-product",
          description: "A product created during integration testing",
          price: 299000,
          img_url: "/uploads/products/test-product.jpg",
          variants: [
            { size: "S", stock: 10 },
            { size: "M", stock: 20 },
          ],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.payload).toHaveProperty("id");
      expect(res.body.payload.slug).toBe("test-integration-product");
      expect(res.body.payload.variants.length).toBe(2);

      createdProduct = res.body.payload;
    });

    it("should return 401 when creating product without auth token", async () => {
      const res = await request(app)
        .post("/api/product")
        .send({
          category_id: categoryId,
          sku: "TEST-NO-AUTH",
          name: "No Auth Product",
          slug: "no-auth-product",
          description: "Should fail",
          price: 100000,
          img_url: "/uploads/products/noauth.jpg",
          variants: [],
        });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==========================================
  // GET PRODUCT LIST
  // ==========================================
  describe("GET /api/product", () => {
    it("should fetch product list", async () => {
      const res = await request(app).get("/api/product");

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.payload).toHaveProperty("products");
      expect(Array.isArray(res.body.payload.products)).toBe(true);
    });
  });

  // ==========================================
  // GET PRODUCT DETAIL BY ID
  // ==========================================
  describe("GET /api/product/:id", () => {
    it("should fetch product detail by id", async () => {
      const res = await request(app).get(
        `/api/product/${createdProduct.id}`,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.payload.id).toBe(createdProduct.id);
      expect(res.body.payload.slug).toBe("test-integration-product");
    });
  });

  // ==========================================
  // SLUG HANDLER: GET BY CATEGORY SLUG
  // ==========================================
  describe("GET /api/product/*slugPath (Slug Handler)", () => {
    it("should fetch category detail via /api/product/test-product-category", async () => {
      const res = await request(app).get(
        "/api/product/test-product-category",
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.payload.type).toBe("category");
      expect(res.body.payload.category.slug).toBe("test-product-category");
    });

    it("should fetch product via slug path /api/product/test-product-category/test-integration-product", async () => {
      const res = await request(app).get(
        "/api/product/test-product-category/test-integration-product",
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.payload.type).toBe("product");
      expect(res.body.payload.product.slug).toBe("test-integration-product");
    });

    it("should return 404 for non-existent category slug", async () => {
      const res = await request(app).get(
        "/api/product/slug-tidak-ada-sama-sekali",
      );

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toBe("Category or product not found");
    });

    it("should return 404 for non-existent product under valid category", async () => {
      const res = await request(app).get(
        "/api/product/test-product-category/product-tidak-ada",
      );

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toBe("Category or product not found");
    });
  });
});
