import express from "express";
import { verifyAccessToken } from "../../middleware/authMiddleware.js";
import { CategoryController } from "./category.controller.js";
import { verifyAdmin } from "../../middleware/adminMiddleware.js";
import { cacheResponse, invalidateCache } from "../../middleware/cacheMiddleware.js";

const router = express.Router();

router.post(
  "/",
  verifyAccessToken,
  verifyAdmin,
  invalidateCache("categories"),
  CategoryController.createCategories
);
router.get("/", cacheResponse(600, "categories"), CategoryController.getCategories);
router.delete(
  "/:id",
  verifyAccessToken,
  verifyAdmin,
  invalidateCache("categories"),
  CategoryController.deleteCategories
);

export default router;
