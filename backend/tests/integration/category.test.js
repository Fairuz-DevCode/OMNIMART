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

describe("CATEGORY API INTEGRATION TESTS", () => {
  let adminToken;
  let parentCategory;
  let subCategory;

  beforeAll(async () => {
    adminToken = jwt.sign(
      { id: 1, email: "admin@example.com", role: "admin" },
      process.env.JWT_ACCESS_SECRET || "Acces89",
      { expiresIn: "1h" },
    );

    // Clean up leftover test data
    await pool.query(
      `DELETE FROM categories WHERE slug IN ('test-elektronik', 'test-handphone')`,
    );
  });

  afterAll(async () => {
    if (subCategory && subCategory.id) {
      await pool.query(
        `DELETE FROM categories WHERE id = $1`,
        [subCategory.id],
      );
    }
    if (parentCategory && parentCategory.id) {
      await pool.query(
        `DELETE FROM categories WHERE id = $1`,
        [parentCategory.id],
      );
    }
  });

  describe("POST /api/categories", () => {
    it("should return 401 if access token is missing", async () => {
      const res = await request(app)
        .post("/api/categories")
        .send({
          name: "Test Elektronik",
          slug: "test-elektronik",
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain("Not authorized");
    });

    it("should create parent category successfully when authenticated", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Elektronik",
          slug: "test-elektronik",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.payload).toHaveProperty("id");
      expect(res.body.payload.slug).toBe("test-elektronik");

      parentCategory = res.body.payload;
    });

    it("should create subcategory referencing parent category", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Handphone",
          slug: "test-handphone",
          parent_id: parentCategory.id,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.payload.parent_id).toBe(parentCategory.id);

      subCategory = res.body.payload;
    });
  });

  describe("GET /api/categories", () => {
    it("should list all categories without authentication", async () => {
      const res = await request(app).get("/api/categories");

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(Array.isArray(res.body.payload)).toBe(true);
    });
  });
});
