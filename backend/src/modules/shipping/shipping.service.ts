import prisma from "../../config/prisma.js";
import { ShippingModel } from "./shipping.model.js";
import { OrderModel } from "../order/order.model.js";
import { UpdateShippingDTO, CalculateShippingDTO, ShippingResponse } from "./shipping.types.js";
import { AppError } from "../../utils/appError.js";

export class ShippingServices {
  static async updateShippingStatus(orderId: number, { courier, tracking_number, shipping_status }: UpdateShippingDTO): Promise<ShippingResponse> {
    const order = await OrderModel.getOrderById(null, orderId);
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (order.status !== "paid" && order.status !== "shipped" && order.status !== "completed") {
      throw new AppError("Order must be paid before updating shipping status", 400);
    }

    return await prisma.$transaction(async (tx) => {
      const dbStatus = shipping_status === "shipped" ? "in_transit" : shipping_status;

      const shipping = await ShippingModel.upsertShipping(tx, orderId, {
        courier,
        tracking_number,
        shipping_status: dbStatus,
      });

      await OrderModel.updateOrderStatus(tx, orderId, "shipped");

      return {
        order_id: Number(shipping.order_id),
        courier: shipping.courier,
        tracking_number: shipping.tracking_number,
        shipping_status: shipping_status === "in_transit" ? "shipped" : shipping.shipping_status,
        shipped_at: shipping.shipped_at || new Date().toISOString(),
      };
    });
  }

  static async getShippingDetail(userId: number, orderId: number, userRole = "customer"): Promise<ShippingResponse> {
    const order = await OrderModel.getOrderById(null, orderId);
    if (!order || (order.user_id !== userId && userRole !== "admin")) {
      throw new AppError("Shipping information not found", 404);
    }

    const shipping = await ShippingModel.getShippingByOrderId(null, orderId);
    if (!shipping) {
      throw new AppError("Shipping information not found", 404);
    }

    return {
      order_id: Number(shipping.order_id),
      courier: shipping.courier === "PENDING" ? null : shipping.courier,
      tracking_number: shipping.tracking_number,
      shipping_status: shipping.shipping_status === "in_transit" ? "shipped" : shipping.shipping_status,
      shipped_at: shipping.shipped_at,
      delivered_at: shipping.shipping_status === "delivered" ? shipping.shipped_at : null,
    };
  }

  static async confirmOrderReceived(userId: number, orderId: number): Promise<any> {
    const order = await OrderModel.getOrderById(null, orderId);
    if (!order || order.user_id !== userId) {
      throw new AppError("Order not found", 404);
    }

    const shipping = await ShippingModel.getShippingByOrderId(null, orderId);
    if (!shipping || (shipping.shipping_status !== "in_transit" && shipping.shipping_status !== "shipped" && order.status !== "shipped")) {
      throw new AppError("Cannot complete order before it is shipped", 400);
    }

    return await prisma.$transaction(async (tx) => {
      await ShippingModel.markAsDelivered(tx, orderId);
      await OrderModel.updateOrderStatus(tx, orderId, "completed");

      const deliveredAt = new Date().toISOString();
      return {
        order_id: Number(orderId),
        shipping_status: "delivered",
        order_status: "completed",
        delivered_at: deliveredAt,
      };
    });
  }

  static async calculateShippingCost({ destination_city, weight = 1000, courier = "JNE" }: CalculateShippingDTO): Promise<any> {
    const baseCost = 20000;
    return {
      courier,
      service: "REG",
      cost: baseCost,
      estimated_days: "2-3",
    };
  }
}
