import { Request, Response, NextFunction } from "express";
import { ReviewModel } from "./review.model.js";

export class ReviewController {
  static async getProductReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = Number(req.params.productId);
      const reviews = await ReviewModel.getReviewsByProduct(productId);
      const stats = await ReviewModel.getAverageRating(productId);

      return res.status(200).json({
        status: "success",
        data: {
          stats,
          reviews,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const productId = Number(req.params.productId);
      const { rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          status: "error",
          message: "Rating must be between 1 and 5",
        });
      }

      const review = await ReviewModel.addReview(userId, productId, Number(rating), comment);

      return res.status(201).json({
        status: "success",
        message: "Review added successfully",
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }
}
