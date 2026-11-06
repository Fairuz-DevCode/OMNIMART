import { Request, Response, NextFunction } from "express";
import { CartServices } from "./cart.service.js";

export class CartController {
  static async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const newItem = await CartServices.addItem(userId, req.body);
      return res.status(201).json({
        status: "success",
        message: "Item added to cart successfully",
        data: newItem,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const cartData = await CartServices.getUserCart(userId);
      return res.status(200).json({
        status: "success",
        message: "User cart fetched successfully",
        data: cartData,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateItemQuantity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const itemId = parseInt(req.params.id as string, 10);
      const updatedItem = await CartServices.updateItemQuantity(userId, itemId, req.body.quantity);
      return res.status(200).json({
        status: "success",
        message: "Cart item quantity updated successfully",
        data: updatedItem,
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const itemId = parseInt(req.params.id as string, 10);
      await CartServices.removeItem(userId, itemId);
      return res.status(200).json({
        status: "success",
        message: "Item removed from cart successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
