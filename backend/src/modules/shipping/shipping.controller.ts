import { Request, Response, NextFunction } from "express";
import { ShippingServices } from "./shipping.service.js";

export class ShippingController {
  static async updateShipping(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = parseInt(req.params.orderId as string, 10);
      const data = await ShippingServices.updateShippingStatus(orderId, req.body);
      return res.status(200).json({
        status: "success",
        message: "Shipping information updated successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getShipping(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const orderId = parseInt(req.params.orderId as string, 10);
      const userRole = req.user!.role || "customer";
      const data = await ShippingServices.getShippingDetail(userId, orderId, userRole);
      return res.status(200).json({
        status: "success",
        message: "Shipping details fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async completeOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const orderId = parseInt(req.params.orderId as string, 10);
      const data = await ShippingServices.confirmOrderReceived(userId, orderId);
      return res.status(200).json({
        status: "success",
        message: "Order completed successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async calculateCost(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ShippingServices.calculateShippingCost(req.body);
      return res.status(200).json({
        status: "success",
        message: "Shipping cost calculated successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
