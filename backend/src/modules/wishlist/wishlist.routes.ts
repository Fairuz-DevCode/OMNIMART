import { Router } from "express";
import { WishlistController } from "./wishlist.controller.js";
import { verifyAccessToken } from "../../middleware/authMiddleware.js";

const router = Router();

router.get("/", verifyAccessToken, WishlistController.getUserWishlist);
router.post("/toggle", verifyAccessToken, WishlistController.toggleWishlist);

export default router;
