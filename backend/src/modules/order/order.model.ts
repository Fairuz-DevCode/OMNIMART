import prisma from "../../config/prisma.js";
import { status as PrismaOrderStatus } from "@prisma/client";
import { AppError } from "../../utils/appError.js";

export class OrderModel {
  static async createOrder(
    tx: any,
    { order_number, user_id, address_id, total_amount, shipping_cost, status = "pending" }: {
      order_number: string;
      user_id: number;
      address_id: number;
      total_amount: number;
      shipping_cost: number;
      status?: string;
    }
  ): Promise<any> {
    const db = tx || prisma;
    return await db.orders.create({
      data: {
        order_number,
        user_id,
        address_id,
        total_amount,
        shipping_cost,
        status: (status as PrismaOrderStatus) || "pending",
      },
    });
  }

  static async createOrderItem(
    tx: any,
    { order_id, product_id, product_name, size, price, quantity }: {
      order_id: number;
      product_id: number;
      product_name: string;
      size: string;
      price: number;
      quantity: number;
    }
  ): Promise<any> {
    const db = tx || prisma;
    return await db.order_items.create({
      data: {
        order_id,
        product_id,
        product_name,
        size,
        price,
        quantity,
      },
    });
  }

  static async deductVariantStock(tx: any, variantId: number, quantity: number): Promise<any> {
    const db = tx || prisma;
    const result = await db.product_variants.updateMany({
      where: {
        id: Number(variantId),
        stock: { gte: quantity }, // Proteksi Race Condition: pastikan stok >= quantity saat lock diperoleh
      },
      data: {
        stock: { decrement: quantity },
      },
    });

    if (result.count === 0) {
      throw new AppError("Stock is insufficient or already depleted by another transaction", 400);
    }

    return result;
  }

  static async restoreStockForOrder(tx: any, orderId: number): Promise<void> {
    const db = tx || prisma;
    const items = await db.order_items.findMany({
      where: { order_id: Number(orderId) },
      select: { product_id: true, size: true, quantity: true },
    });

    await Promise.all(
      items.map((item: any) =>
        db.product_variants.updateMany({
          where: { product_id: item.product_id, size: item.size },
          data: { stock: { increment: item.quantity } },
        })
      )
    );
  }

  static async getUserOrders(tx: any, userId: number): Promise<any[]> {
    const db = tx || prisma;
    return await db.orders.findMany({
      where: { user_id: Number(userId) },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        order_number: true,
        total_amount: true,
        status: true,
        created_at: true,
      },
    });
  }

  static async getOrderById(tx: any, orderId: number): Promise<any> {
    const db = tx || prisma;
    return await db.orders.findUnique({
      where: { id: Number(orderId) },
    });
  }

  static async getOrderByNumber(tx: any, orderNumber: string): Promise<any> {
    const db = tx || prisma;
    return await db.orders.findUnique({
      where: { order_number: orderNumber },
    });
  }

  static async getOrderItems(tx: any, orderId: number): Promise<any[]> {
    const db = tx || prisma;
    return await db.order_items.findMany({
      where: { order_id: Number(orderId) },
      orderBy: { id: "asc" },
      select: {
        id: true,
        product_id: true,
        product_name: true,
        size: true,
        price: true,
        quantity: true,
      },
    });
  }

  static async getOrderAddress(tx: any, addressId: number): Promise<any> {
    const db = tx || prisma;
    return await db.addresses.findUnique({
      where: { id: Number(addressId) },
      select: {
        label: true,
        phone: true,
        street_address: true,
        city: true,
        postal_code: true,
        country: true,
      },
    });
  }

  static async updateOrderStatus(tx: any, orderId: number, status: string): Promise<any> {
    const db = tx || prisma;
    return await db.orders.update({
      where: { id: Number(orderId) },
      data: { status: status as PrismaOrderStatus },
      select: {
        id: true,
        order_number: true,
        status: true,
      },
    });
  }

  static async getAllOrdersAdmin(
    tx: any,
    {
      page = 1,
      limit = 20,
      status,
      search,
    }: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    }
  ): Promise<{ orders: any[]; total: number; page: number; totalPages: number }> {
    const db = tx || prisma;
    const offset = (page - 1) * limit;
    const where: any = {};

    if (status && status !== "all" && status !== "Semua") {
      where.status = status.toLowerCase() as PrismaOrderStatus;
    }

    if (search && search.trim() !== "") {
      const term = search.trim();
      where.OR = [
        { order_number: { contains: term, mode: "insensitive" } },
        { addresses: { street_address: { contains: term, mode: "insensitive" } } },
        { shippings: { some: { tracking_number: { contains: term, mode: "insensitive" } } } },
      ];
    }

    const [orders, total] = await Promise.all([
      db.orders.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: "desc" },
        include: {
          addresses: true,
          shippings: { orderBy: { id: "desc" }, take: 1 },
          payments: { orderBy: { id: "desc" }, take: 1 },
          order_items: true,
        },
      }),
      db.orders.count({ where }),
    ]);

    // Optimasi N+1: Ambil semua data user sekaligus (Batch Query dengan IN clause)
    const userIds = Array.from(new Set(orders.map((o: any) => o.user_id)));
    const users =
      userIds.length > 0
        ? await db.users.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true, phone: true },
          })
        : [];
    const userMap = new Map<number, any>(users.map((u: any) => [u.id, u]));

    // Mapping sinkron di memori tanpa query database tambahan di dalam loop
    const mappedOrders = orders.map((o: any) => {
      const user = userMap.get(o.user_id);
      const latestShipping = o.shippings?.[0];
      const latestPayment = o.payments?.[0];

      return {
        id: o.id,
        order_number: o.order_number,
        user_id: o.user_id,
        address_id: o.address_id,
        total_amount: o.total_amount,
        shipping_cost: o.shipping_cost,
        status: o.status,
        created_at: o.created_at,
        customer_name: user?.name || "Pelanggan",
        customer_email: user?.email || "",
        customer_phone: user?.phone || "",
        address_label: o.addresses?.label,
        street_address: o.addresses?.street_address,
        city: o.addresses?.city,
        postal_code: o.addresses?.postal_code,
        country: o.addresses?.country,
        courier_name: latestShipping?.courier_name || null,
        tracking_number: latestShipping?.tracking_number || null,
        shipping_status: latestShipping?.shipping_status || null,
        shipped_at: latestShipping?.shipped_at || null,
        payment_type: latestPayment?.payment_type || null,
        transaction_status: latestPayment?.transaction_status || null,
        payment_url: latestPayment?.payment_url || null,
        items: o.order_items.map((oi: any) => ({
          id: oi.id,
          product_id: oi.product_id,
          product_name: oi.product_name,
          size: oi.size,
          price: oi.price,
          quantity: oi.quantity,
        })),
      };
    });

    return {
      orders: mappedOrders,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
