import { Request, Response, NextFunction } from "express";
import { WishlistModel } from "./wishlist.model.js";

export class WishlistController {
  static async getUserWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const wishlist = await WishlistModel.getWishlist(userId);

      return res.status(200).json({
        status: "success",
        data: wishlist,
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({
          status: "error",
          message: "Product ID is required",
        });
      }

      const result = await WishlistModel.toggleWishlist(userId, Number(productId));

      return res.status(200).json({
        status: "success",
        message: result.inWishlist ? "Added to wishlist" : "Removed from wishlist",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
