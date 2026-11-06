import prisma from "../../config/prisma.js";

export class ReviewModel {
  static async getReviewsByProduct(productId: number) {
    const reviews = await prisma.product_reviews.findMany({
      where: { product_id: productId },
      orderBy: { created_at: "desc" },
      include: {
        users: {
          select: { name: true },
        },
      },
    });

    return reviews.map((r) => ({
      id: r.id,
      product_id: r.product_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      user_name: r.users?.name || "Anonim",
    }));
  }

  static async addReview(userId: number, productId: number, rating: number, comment?: string) {
    return await prisma.product_reviews.create({
      data: {
        user_id: userId,
        product_id: productId,
        rating,
        comment,
      },
    });
  }

  static async getAverageRating(productId: number) {
    const agg = await prisma.product_reviews.aggregate({
      where: { product_id: productId },
      _avg: { rating: true },
      _count: { id: true },
    });

    return {
      avg_rating: agg._avg.rating ? Number(agg._avg.rating.toFixed(1)) : 0,
      total_reviews: agg._count.id || 0,
    };
  }
}
