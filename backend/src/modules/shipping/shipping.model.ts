import prisma from "../../config/prisma.js";
import { shipping_status } from "@prisma/client";

export class ShippingModel {
  static async createShipping(
    tx: any,
    { order_id, courier_name = "PENDING", tracking_number = null, shipping_status: status = "pending" }: {
      order_id: number;
      courier_name?: string;
      tracking_number?: string | null;
      shipping_status?: string;
    }
  ): Promise<any> {
    const db = tx || prisma;
    const created = await db.shippings.create({
      data: {
        order_id: Number(order_id),
        courier_name,
        tracking_number,
        shipping_status: (status as shipping_status) || "pending",
      },
    });

    return {
      id: created.id,
      order_id: created.order_id,
      courier: created.courier_name,
      tracking_number: created.tracking_number,
      shipping_status: created.shipping_status,
    };
  }

  static async getShippingByOrderId(tx: any, orderId: number): Promise<any> {
    const db = tx || prisma;
    const shipping = await db.shippings.findFirst({
      where: { order_id: Number(orderId) },
      orderBy: { id: "desc" },
    });

    if (!shipping) return null;
    return {
      id: shipping.id,
      order_id: shipping.order_id,
      courier: shipping.courier_name,
      tracking_number: shipping.tracking_number,
      shipping_status: shipping.shipping_status,
      shipped_at: shipping.shipped_at,
    };
  }

  static async upsertShipping(
    tx: any,
    orderId: number,
    { courier, tracking_number, shipping_status: status }: {
      courier: string;
      tracking_number: string;
      shipping_status: string;
    }
  ): Promise<any> {
    const db = tx || prisma;
    const dbStatus = (status === "shipped" ? "in_transit" : status) as shipping_status;
    const shippedAt = dbStatus === "in_transit" || dbStatus === "delivered" ? new Date() : null;

    const existing = await db.shippings.findFirst({
      where: { order_id: Number(orderId) },
      orderBy: { id: "desc" },
    });

    if (existing) {
      const updated = await db.shippings.update({
        where: { id: existing.id },
        data: {
          courier_name: courier,
          tracking_number,
          shipping_status: dbStatus,
          shipped_at: existing.shipped_at || shippedAt,
        },
      });
      return {
        order_id: updated.order_id,
        courier: updated.courier_name,
        tracking_number: updated.tracking_number,
        shipping_status: updated.shipping_status,
        shipped_at: updated.shipped_at,
      };
    } else {
      const created = await db.shippings.create({
        data: {
          order_id: Number(orderId),
          courier_name: courier,
          tracking_number,
          shipping_status: dbStatus,
          shipped_at: shippedAt,
        },
      });
      return {
        order_id: created.order_id,
        courier: created.courier_name,
        tracking_number: created.tracking_number,
        shipping_status: created.shipping_status,
        shipped_at: created.shipped_at,
      };
    }
  }

  static async markAsDelivered(tx: any, orderId: number): Promise<any> {
    const db = tx || prisma;
    const existing = await db.shippings.findFirst({
      where: { order_id: Number(orderId) },
      orderBy: { id: "desc" },
    });

    if (!existing) return null;

    const updated = await db.shippings.update({
      where: { id: existing.id },
      data: {
        shipping_status: "delivered",
        shipped_at: existing.shipped_at || new Date(),
      },
    });

    return {
      order_id: updated.order_id,
      courier: updated.courier_name,
      tracking_number: updated.tracking_number,
      shipping_status: updated.shipping_status,
      shipped_at: updated.shipped_at,
    };
  }
}
