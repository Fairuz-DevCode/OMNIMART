import prisma from "../../config/prisma.js";

export class WishlistModel {
  static async getWishlist(userId: number) {
    const items = await prisma.wishlists.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      include: {
        products: {
          include: {
            categories: {
              select: { name: true },
            },
          },
        },
      },
    });

    return items.map((w) => ({
      id: w.id,
      product_id: w.product_id,
      created_at: w.created_at,
      name: w.products?.name,
      slug: w.products?.slug,
      price: w.products?.price,
      img_url: w.products?.img_url,
      category_name: w.products?.categories?.name,
    }));
  }

  static async toggleWishlist(userId: number, productId: number) {
    const existing = await prisma.wishlists.findUnique({
      where: {
        user_id_product_id: {
          user_id: userId,
          product_id: productId,
        },
      },
    });

    if (existing) {
      await prisma.wishlists.delete({
        where: { id: existing.id },
      });
      return { inWishlist: false };
    } else {
      await prisma.wishlists.create({
        data: {
          user_id: userId,
          product_id: productId,
        },
      });
      return { inWishlist: true };
    }
  }
}
