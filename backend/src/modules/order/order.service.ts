import prisma from "../../config/prisma.js";
import redis from "../../config/redis.js";
import { deleteKeysByPattern } from "../../middleware/cacheMiddleware.js";
import { OrderModel } from "./order.model.js";
import { CartModel } from "../cart/cart.model.js";
import { ShippingModel } from "../shipping/shipping.model.js";
import { CreateOrderDTO, OrderResponse } from "./order.types.js";
import { AppError } from "../../utils/appError.js";

const generateOrderNumber = (): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomStr}`;
};

export class OrderServices {
  static async createOrder(userId: number, { address_id, shipping_cost }: CreateOrderDTO): Promise<OrderResponse> {
    const address = await OrderModel.getOrderAddress(null, address_id);
    if (!address) {
      throw new AppError("Address not found", 404);
    }

    const cart = await CartModel.getCartByUserId(null, userId);
    if (!cart) {
      throw new AppError("Cart is empty or stock is insufficient", 400);
    }

    const cartItems = await CartModel.getCartDetails(null, cart.id);
    if (!cartItems || cartItems.length === 0) {
      throw new AppError("Cart is empty or stock is insufficient", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Sort variant items to prevent deadlocks when multiple transactions lock rows concurrently
      const sortedCartItems = [...cartItems].sort(
        (a, b) => a.product_variant_id - b.product_variant_id
      );

      // Optimasi N+1: Ambil semua data varian sekaligus dalam 1 query batch (WHERE id IN (...))
      const variantIds = sortedCartItems.map((item) => item.product_variant_id);
      const variants = await tx.product_variants.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, product_id: true, size: true, stock: true },
      });
      const variantMap = new Map(variants.map((v) => [v.id, v]));

      for (const item of sortedCartItems) {
        const variant = variantMap.get(item.product_variant_id);
        if (!variant || variant.stock < item.quantity) {
          throw new AppError("Cart is empty or stock is insufficient", 400);
        }
      }

      const itemsTotal = cartItems.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      );
      const totalAmount = itemsTotal + Number(shipping_cost);
      const orderNumber = generateOrderNumber();

      const newOrder = await OrderModel.createOrder(tx, {
        order_number: orderNumber,
        user_id: userId,
        address_id,
        total_amount: totalAmount,
        shipping_cost: Number(shipping_cost),
        status: "pending",
      });

      const orderItems: any[] = [];
      for (const item of cartItems) {
        const createdOrderItem = await OrderModel.createOrderItem(tx, {
          order_id: newOrder.id,
          product_id: item.product_id,
          product_name: item.product_name,
          size: item.size,
          price: Number(item.price),
          quantity: item.quantity,
        });

        await OrderModel.deductVariantStock(tx, item.product_variant_id, item.quantity);

        orderItems.push({
          id: createdOrderItem.id,
          product_id: createdOrderItem.product_id,
          product_name: createdOrderItem.product_name,
          size: createdOrderItem.size,
          price: Number(createdOrderItem.price),
          quantity: createdOrderItem.quantity,
        });
      }

      await ShippingModel.createShipping(tx, {
        order_id: newOrder.id,
        shipping_status: "pending",
      });

      await CartModel.clearCartItems(tx, cart.id);

      return {
        id: newOrder.id,
        order_number: newOrder.order_number,
        user_id: newOrder.user_id,
        address_id: newOrder.address_id,
        total_amount: Number(newOrder.total_amount),
        shipping_cost: Number(newOrder.shipping_cost),
        status: newOrder.status,
        created_at: newOrder.created_at,
        items: orderItems,
      };
    });

    // Invalidate cache setelah transaksi berhasil
    redis.del(`cart:user:${userId}`).catch((err: any) => {
      console.warn("Failed to invalidate cart cache after checkout:", err);
    });
    deleteKeysByPattern("products:*");

    return result;
  }

  static async getUserOrders(userId: number): Promise<any[]> {
    const orders = await OrderModel.getUserOrders(null, userId);
    return orders.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      total_amount: Number(o.total_amount),
      status: o.status,
      created_at: o.created_at,
    }));
  }

  static async getOrderDetail(userId: number, orderId: number, userRole = "customer"): Promise<any> {
    const order = await OrderModel.getOrderById(null, orderId);
    if (!order || (order.user_id !== userId && userRole !== "admin")) {
      throw new AppError("Order not found", 404);
    }

    const address = await OrderModel.getOrderAddress(null, order.address_id);
    const items = await OrderModel.getOrderItems(null, order.id);

    return {
      id: order.id,
      order_number: order.order_number,
      total_amount: Number(order.total_amount),
      shipping_cost: Number(order.shipping_cost),
      status: order.status,
      created_at: order.created_at,
      address: address
        ? {
            label: address.label,
            phone: address.phone,
            street_address: address.street_address,
            city: address.city,
            postal_code: address.postal_code,
            country: address.country,
          }
        : null,
      items: items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        size: item.size,
        price: Number(item.price),
        quantity: item.quantity,
      })),
    };
  }

  static async cancelOrder(userId: number, orderId: number): Promise<any> {
    const order = await OrderModel.getOrderById(null, orderId);
    if (!order || order.user_id !== userId) {
      throw new AppError("Order not found", 404);
    }

    if (order.status === "shipped" || order.status === "completed") {
      throw new AppError("Cannot cancel order that has already been shipped or completed", 400);
    }

    if (order.status === "cancel") {
      return {
        id: order.id,
        order_number: order.order_number,
        status: "cancel",
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      await OrderModel.restoreStockForOrder(tx, order.id);
      return await OrderModel.updateOrderStatus(tx, order.id, "cancel");
    });

    // Invalidate cache produk setelah stok dikembalikan
    deleteKeysByPattern("products:*");

    return {
      id: updated.id,
      order_number: updated.order_number,
      status: updated.status,
    };
  }

  static async getAllOrdersForAdmin(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<any> {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    return await OrderModel.getAllOrdersAdmin(null, {
      page,
      limit,
      status: query.status,
      search: query.search,
    });
  }

  static async updateOrderStatusByAdmin(orderId: number, status: string): Promise<any> {
    const validStatuses = ["pending", "paid", "shipped", "completed", "cancel"];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
    }

    const order = await OrderModel.getOrderById(null, orderId);
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Jika dibatalkan dan status sebelumnya bukan cancel, kembalikan stok
      if (status === "cancel" && order.status !== "cancel") {
        await OrderModel.restoreStockForOrder(tx, orderId);
      }

      return await OrderModel.updateOrderStatus(tx, orderId, status);
    });

    if (status === "cancel" && order.status !== "cancel") {
      deleteKeysByPattern("products:*");
    }

    return updated;
  }
}
