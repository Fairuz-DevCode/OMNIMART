import { Router } from "express";
import { ReviewController } from "./review.controller.js";
import { verifyAccessToken } from "../../middleware/authMiddleware.js";
import { validate } from "../../middleware/validateMiddleware.js";
import { createReviewSchema } from "./review.validation.js";

const router = Router();

router.get("/products/:productId/reviews", ReviewController.getProductReviews);
router.post(
  "/products/:productId/reviews",
  verifyAccessToken,
  validate(createReviewSchema),
  ReviewController.createReview
);

export default router;
