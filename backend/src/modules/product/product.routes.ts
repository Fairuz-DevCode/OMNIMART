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

// 1. Query variasi kecil (katalog default tanpa filter/search): Cache di Redis selama 10 menit (600s)
//    Query variasi besar (search teks bebas, cursor pagination tak terbatas): Skip cache, arahkan ke DB Read Replica
router.get(
  "/",
  cacheResponse(600, "products", {
    shouldSkip: (req) => Boolean(req.query.search || req.query.cursor),
  }),
  ProductController.getProduct
);

// 2. Detail produk & slug path (variasi kecil, dibatasi oleh jumlah produk): Cache di Redis selama 10 menit (600s)
router.get("/:id", cacheResponse(600, "products"), ProductController.getProductDetail);

// Dynamic Catch-All Route for /categories/[category-slug] and /categories/[category-slug]/[product-slug]
router.get("/*slugPath", cacheResponse(600, "products"), ProductController.getBySlugPath);

export default router;
