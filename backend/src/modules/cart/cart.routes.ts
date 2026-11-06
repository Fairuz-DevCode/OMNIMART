import express from "express";
import { verifyAccessToken } from "../../middleware/authMiddleware.js";
import { validate } from "../../middleware/validateMiddleware.js";
import { addCartItemSchema, updateCartItemSchema } from "./cart.validation.js";
import { CartController } from "./cart.controller.js";
import { cacheUserResponse, invalidateUserCache } from "../../middleware/cacheMiddleware.js";

const router = express.Router();

router.get("/", verifyAccessToken, cacheUserResponse(600, "cart"), CartController.getCart);
router.post(
  "/items",
  verifyAccessToken,
  validate(addCartItemSchema),
  invalidateUserCache("cart"),
  CartController.addItem
);
router.patch(
  "/items/:id",
  verifyAccessToken,
  validate(updateCartItemSchema),
  invalidateUserCache("cart"),
  CartController.updateItemQuantity
);
router.delete(
  "/items/:id",
  verifyAccessToken,
  invalidateUserCache("cart"),
  CartController.removeItem
);

export default router;
