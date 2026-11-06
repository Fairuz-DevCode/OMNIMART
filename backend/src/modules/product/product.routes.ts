import express from "express";
import { verifyAccessToken } from "../../middleware/authMiddleware.js";
import { uploadProductImage } from "../../middleware/uploadProductImageMiddleware.js";
import { verifyAdmin } from "../../middleware/adminMiddleware.js";
import { cacheResponse, invalidateCache } from "../../middleware/cacheMiddleware.js";
import { ProductController } from "./product.controller.js";

const router = express.Router();

// Invalidate cache saat ada produk dibuat, diupdate, atau dihapus
router.post(
  "/",
  verifyAccessToken,
  verifyAdmin,
  uploadProductImage,
  invalidateCache("products"),
  ProductController.createProduct
);
router.patch(
  "/:id",
  verifyAccessToken,
  verifyAdmin,
  uploadProductImage,
  invalidateCache("products"),
  ProductController.updateProduct
);
router.delete(
  "/:id",
  verifyAccessToken,
  verifyAdmin,
  invalidateCache("products"),
  ProductController.deleteProduct
);

// Cache GET routes selama 5 menit (300 detik)
router.get("/", cacheResponse(300, "products"), ProductController.getProduct);
router.get("/:id", cacheResponse(300, "products"), ProductController.getProductDetail);

// Dynamic Catch-All Route for /categories/[category-slug] and /categories/[category-slug]/[product-slug]
router.get("/*slugPath", cacheResponse(300, "products"), ProductController.getBySlugPath);

export default router;
