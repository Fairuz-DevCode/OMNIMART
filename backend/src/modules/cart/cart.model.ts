import prisma from "../../config/prisma.js";

export class CartModel {
  static async findOrCreateCart(tx: any, userId: number): Promise<{ id: number; user_id: number }> {
    const db = tx || prisma;
    return await db.carts.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId },
      select: { id: true, user_id: true },
    });
  }

  static async getCartByUserId(tx: any, userId: number): Promise<{ id: number; user_id: number } | null> {
    const db = tx || prisma;
    return await db.carts.findUnique({
      where: { user_id: userId },
      select: { id: true, user_id: true },
    });
  }

  static async findCartItem(tx: any, cartId: number, productVariantId: number): Promise<any> {
    const db = tx || prisma;
    return await db.cart_items.findFirst({
      where: { cart_id: cartId, product_variant_id: productVariantId },
    });
  }

  static async findCartItemById(tx: any, itemId: number): Promise<any> {
    const db = tx || prisma;
    const item = await db.cart_items.findUnique({
      where: { id: itemId },
      include: { carts: { select: { user_id: true } } },
    });
    if (!item) return null;
    return {
      id: item.id,
      cart_id: item.cart_id,
      product_id: item.product_id,
      product_variant_id: item.product_variant_id,
      quantity: item.quantity,
      user_id: item.carts?.user_id,
    };
  }

  static async addCartItem(tx: any, cartId: number, productId: number, productVariantId: number, quantity: number): Promise<any> {
    const db = tx || prisma;
    return await db.cart_items.create({
      data: {
        cart_id: cartId,
        product_id: productId,
        product_variant_id: productVariantId,
        quantity,
      },
    });
  }

  static async updateCartItemQuantity(tx: any, itemId: number, quantity: number): Promise<any> {
    const db = tx || prisma;
    return await db.cart_items.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  static async removeCartItem(tx: any, itemId: number): Promise<any> {
    const db = tx || prisma;
    return await db.cart_items.delete({
      where: { id: itemId },
    });
  }

  static async getCartDetails(tx: any, cartId: number): Promise<any[]> {
    const db = tx || prisma;
    const items = await db.cart_items.findMany({
      where: { cart_id: cartId },
      orderBy: { id: "asc" },
      include: {
        products: {
          select: { name: true, img_url: true, price: true },
        },
        product_variants: {
          select: { size: true },
        },
      },
    });

    return items.map((ci: any) => ({
      id: ci.id,
      product_id: ci.product_id,
      product_name: ci.products?.name,
      product_img_url: ci.products?.img_url,
      product_variant_id: ci.product_variant_id,
      size: ci.product_variants?.size,
      price: ci.products?.price,
      quantity: ci.quantity,
      subtotal: (ci.products?.price || 0) * ci.quantity,
    }));
  }

  static async clearCartItems(tx: any, cartId: number): Promise<void> {
    const db = tx || prisma;
    await db.cart_items.deleteMany({
      where: { cart_id: cartId },
    });
  }

  static async checkVariantStock(tx: any, variantId: number, _forUpdate: boolean = false): Promise<any> {
    const db = tx || prisma;
    return await db.product_variants.findFirst({
      where: { id: Number(variantId), deleted_at: null },
      select: {
        id: true,
        product_id: true,
        size: true,
        stock: true,
      },
    });
  }
}
