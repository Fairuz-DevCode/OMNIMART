import crypto from "crypto";
import { PaymentModel } from "./payment.model.js";
import { OrderModel } from "../order/order.model.js";
import { snap } from "../../config/midtrans.js";
import prisma from "../../config/prisma.js";
import env from "../../config/env.js";
import { CreatePaymentDTO, PaymentResponse } from "./payment.types.js";
import { AppError } from "../../utils/appError.js";

export class PaymentServices {
  static async createPayment(userId: number, { order_id, payment_type }: CreatePaymentDTO): Promise<PaymentResponse> {
    const order = await OrderModel.getOrderById(null, order_id);
    if (!order || order.user_id !== userId) {
      throw new AppError("Order not found", 404);
    }

    if (order.status !== "pending") {
      throw new AppError("Payment transaction already exists for this order or order is invalid", 400);
    }

    const existingPayment = await PaymentModel.getPaymentByOrderId(null, order_id);
    if (existingPayment && existingPayment.transaction_status === "settlement") {
      throw new AppError("Payment transaction already exists for this order or order is invalid", 400);
    }

    let paymentUrl = "";
    const serverKey = env.MIDTRANS_SERVER_KEY;

    if (serverKey && serverKey !== "SB-Mid-server-placeholder") {
      try {
        const parameter = {
          transaction_details: {
            order_id: `${order.order_number}-${Date.now()}`,
            gross_amount: Number(order.total_amount),
          },
          payment_type: payment_type,
          credit_card: {
            secure: true,
          },
        };
        const transaction = await snap.createTransaction(parameter);
        paymentUrl = transaction.redirect_url;
      } catch (midtransErr) {
        console.error("Midtrans Snap error, fallback to sandbox URL structure:", midtransErr);
        paymentUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${crypto.randomBytes(8).toString("hex")}`;
      }
    } else {
      paymentUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${crypto.randomBytes(8).toString("hex")}`;
    }

    let paymentRecord: any;
    if (existingPayment) {
      paymentRecord = await PaymentModel.updatePaymentStatus(null, order_id, "pending");
    } else {
      paymentRecord = await PaymentModel.createPayment(null, {
        order_id,
        payment_type,
        transaction_status: "pending",
        payment_url: paymentUrl,
      });
    }

    return {
      id: paymentRecord.id,
      order_id: paymentRecord.order_id,
      payment_type: paymentRecord.payment_type,
      transaction_status: paymentRecord.transaction_status,
      payment_url: paymentRecord.payment_url,
      created_at: paymentRecord.created_at,
    };
  }

  static async processNotification(payload: any): Promise<void> {
    const { order_id, transaction_status, signature_key, gross_amount, status_code } = payload || {};

    if (!order_id || !transaction_status) {
      throw new AppError("Invalid signature or payload", 400);
    }

    const serverKey = env.MIDTRANS_SERVER_KEY;
    if (serverKey && serverKey !== "SB-Mid-server-placeholder" && signature_key && gross_amount && status_code) {
      const hash = crypto
        .createHash("sha512")
        .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
        .digest("hex");

      if (hash !== signature_key) {
        throw new AppError("Invalid signature or payload", 400);
      }
    }

    const cleanOrderNumber = order_id.split("-").slice(0, 3).join("-");
    let order = await OrderModel.getOrderByNumber(null, cleanOrderNumber);

    if (!order) {
      if (!isNaN(Number(cleanOrderNumber))) {
        order = await OrderModel.getOrderById(null, parseInt(cleanOrderNumber, 10));
      }
    }

    if (!order) {
      throw new AppError("Invalid signature or payload", 400);
    }

    let mappedPaymentStatus = "pending";
    let targetOrderStatus = order.status;

    if (transaction_status === "settlement" || transaction_status === "capture") {
      mappedPaymentStatus = "settlement";
      targetOrderStatus = "paid";
    } else if (transaction_status === "expire") {
      mappedPaymentStatus = "expire";
      targetOrderStatus = "cancel";
    } else if (transaction_status === "cancel" || transaction_status === "deny") {
      mappedPaymentStatus = "cancel";
      targetOrderStatus = "cancel";
    }

    await prisma.$transaction(async (tx) => {
      await PaymentModel.updatePaymentStatus(tx, order.id, mappedPaymentStatus);

      if (targetOrderStatus === "paid" && order.status !== "paid") {
        await OrderModel.updateOrderStatus(tx, order.id, "paid");
      } else if (targetOrderStatus === "cancel" && order.status !== "cancel") {
        await OrderModel.restoreStockForOrder(tx, order.id);
        await OrderModel.updateOrderStatus(tx, order.id, "cancel");
      }
    });
  }

  static async getPaymentDetail(userId: number, orderId: number, userRole = "customer"): Promise<PaymentResponse> {
    const order = await OrderModel.getOrderById(null, orderId);
    if (!order || (order.user_id !== userId && userRole !== "admin")) {
      throw new AppError("Payment details not found", 404);
    }

    const payment = await PaymentModel.getPaymentByOrderId(null, orderId);
    if (!payment) {
      throw new AppError("Payment details not found", 404);
    }

    return {
      id: payment.id,
      order_id: payment.order_id,
      payment_type: payment.payment_type,
      transaction_status: payment.transaction_status,
      payment_url: payment.payment_url,
      created_at: payment.created_at,
    };
  }
}
