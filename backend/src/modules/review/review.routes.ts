import { Router } from "express";
import { ReviewController } from "./review.controller.js";
import { verifyAccessToken } from "../../middleware/authMiddleware.js";

const router = Router();

router.get("/products/:productId/reviews", ReviewController.getProductReviews);
router.post("/products/:productId/reviews", verifyAccessToken, ReviewController.createReview);

export default router;
