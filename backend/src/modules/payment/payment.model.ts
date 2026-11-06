import prisma from "../../config/prisma.js";
import { transaction_status as PrismaTxStatus } from "@prisma/client";

export class PaymentModel {
  static async createPayment(
    tx: any,
    { order_id, payment_type, transaction_status = "pending", payment_url }: {
      order_id: number;
      payment_type: string;
      transaction_status?: string;
      payment_url: string;
    }
  ): Promise<any> {
    const db = tx || prisma;
    return await db.payments.create({
      data: {
        order_id: Number(order_id),
        payment_type,
        transaction_status: (transaction_status as PrismaTxStatus) || "pending",
        payment_url,
      },
    });
  }

  static async getPaymentByOrderId(tx: any, orderId: number): Promise<any> {
    const db = tx || prisma;
    return await db.payments.findFirst({
      where: { order_id: Number(orderId) },
      orderBy: { created_at: "desc" },
    });
  }

  static async updatePaymentStatus(tx: any, orderId: number, transaction_status: string): Promise<any> {
    const db = tx || prisma;
    const latest = await db.payments.findFirst({
      where: { order_id: Number(orderId) },
      orderBy: { created_at: "desc" },
    });

    if (!latest) return null;

    return await db.payments.update({
      where: { id: latest.id },
      data: {
        transaction_status: transaction_status as PrismaTxStatus,
      },
    });
  }
}
