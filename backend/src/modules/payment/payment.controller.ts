import { Request, Response, NextFunction } from "express";
import { PaymentServices } from "./payment.service.js";

export class PaymentController {
  static async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const paymentData = await PaymentServices.createPayment(userId, req.body);
      return res.status(201).json({
        status: "success",
        message: "Payment transaction created successfully",
        data: paymentData,
      });
    } catch (error) {
      next(error);
    }
  }

  static async handleNotification(req: Request, res: Response, next: NextFunction) {
    try {
      await PaymentServices.processNotification(req.body);
      return res.status(200).json({
        status: "success",
        message: "Payment notification processed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentByOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const orderId = parseInt(req.params.orderId as string, 10);
      const userRole = req.user!.role || "customer";
      const paymentDetail = await PaymentServices.getPaymentDetail(userId, orderId, userRole);
      return res.status(200).json({
        status: "success",
        message: "Payment details fetched successfully",
        data: paymentDetail,
      });
    } catch (error) {
      next(error);
    }
  }
}
