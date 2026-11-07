import prisma from "../../config/prisma.js";
import { CreateProductDTO, ProductResponse, ProductVariantDTO, UpdateProductDTO } from "./product.types.js";

export class ProductModel {
  static async createProduct(
    tx: any,
    { category_id, sku, name, slug, description, price, img_url }: CreateProductDTO
  ): Promise<ProductResponse> {
    const db = tx || prisma;
    const generatedSlug =
      slug ||
      (name
        ? name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        : `prod-${Date.now()}`);

    return (await db.products.create({
      data: {
        category_id,
        sku: sku || `SKU-${Date.now()}`,
        name,
        slug: generatedSlug,
        description: description ?? null,
        price,
        img_url: img_url || "",
      },
    })) as any;
  }

  static async createVariant(
    tx: any,
    productId: number,
    { size, stock }: ProductVariantDTO
  ): Promise<ProductVariantDTO> {
    const db = tx || prisma;
    return await db.product_variants.create({
      data: {
        product_id: Number(productId),
        size,
        stock,
      },
    });
  }

  static async getAllProducts(limit = 10, offset = 0): Promise<{ products: ProductResponse[]; totalItems: number }> {
    const [products, totalItems] = await Promise.all([
      prisma.products.findMany({
        where: { deleted_at: null },
        orderBy: { id: "asc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          category_id: true,
          name: true,
          slug: true,
          price: true,
          img_url: true,
        },
      }),
      prisma.products.count({
        where: { deleted_at: null },
      }),
    ]);

    return {
      products: products as any,
      totalItems,
    };
  }

  /**
   * Keyset / Cursor-based Pagination:
   * Menggunakan kursor penanda `id` terakhir daripada OFFSET tradisional yang lambat pada data ratusan ribu baris.
   */
  static async getProductsByCursor(
    limit: number = 10,
    cursor?: number,
    search?: string
  ): Promise<{ products: ProductResponse[]; nextCursor: number | null }> {
    const whereClause: any = { deleted_at: null };

    if (cursor) {
      whereClause.id = { gt: cursor };
    }

    if (search && search.trim().length > 0) {
      whereClause.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const rows = await prisma.products.findMany({
      where: whereClause,
      orderBy: { id: "asc" },
      take: limit + 1,
      select: {
        id: true,
        category_id: true,
        name: true,
        slug: true,
        price: true,
        img_url: true,
        created_at: true,
      },
    });

    let nextCursor: number | null = null;
    if (rows.length > limit) {
      rows.pop();
      nextCursor = rows[rows.length - 1].id;
    }

    return {
      products: rows as any,
      nextCursor,
    };
  }

  /**
   * Full-Text Search (FTS) dengan toleransi salah ketik (Typo-Tolerance):
   * 1. Coba pencarian berbasis GIN Trigram Index (ILIKE)
   * 2. Jika tidak ada hasil (karena typo), fallback ke Trigram word_similarity threshold
   */
  static async searchProductsFuzzy(
    query: string,
    limit: number = 10,
    cursor?: number
  ): Promise<{ products: ProductResponse[]; nextCursor: number | null }> {
    const cleanQuery = query.trim();

    // 1. Eksekusi pencarian exact / partial match via GIN Trigram Index
    const exactMatches = await this.getProductsByCursor(limit, cursor, cleanQuery);
    if (exactMatches.products.length > 0) {
      return exactMatches;
    }

    // 2. Fallback Typo-Tolerance: Hitung kemiripan trigram menggunakan word_similarity
    const cursorFilter = cursor ? Number(cursor) : 0;
    const fuzzyRows = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id, 
        p.category_id, 
        p.name, 
        p.slug, 
        p.price, 
        p.img_url, 
        p.created_at,
        word_similarity(${cleanQuery}, p.name) AS score
      FROM products p
      WHERE p.deleted_at IS NULL
        AND (${cleanQuery} <% p.name OR word_similarity(${cleanQuery}, p.name) > 0.3)
        AND p.id > ${cursorFilter}
      ORDER BY score DESC, p.id ASC
      LIMIT ${limit + 1}
    `;

    let nextCursor: number | null = null;
    if (fuzzyRows.length > limit) {
      fuzzyRows.pop();
      nextCursor = fuzzyRows[fuzzyRows.length - 1].id;
    }

    return {
      products: fuzzyRows as any,
      nextCursor,
    };
  }

  static async getProductById(id: number | string): Promise<ProductResponse | null> {
    const p = await prisma.products.findFirst({
      where: { id: Number(id), deleted_at: null },
      include: {
        product_variants: {
          where: { deleted_at: null },
          select: { id: true, size: true, stock: true },
        },
      },
    });

    if (!p) return null;

    return {
      ...p,
      variants: p.product_variants,
    } as any;
  }

  static async updateProduct(
    tx: any,
    id: number | string,
    { category_id, sku, img_url, name, slug, description, price }: UpdateProductDTO
  ): Promise<ProductResponse | null> {
    const db = tx || prisma;
    return (await db.products.update({
      where: { id: Number(id) },
      data: {
        ...(category_id !== undefined && { category_id }),
        ...(sku !== undefined && { sku }),
        ...(img_url !== undefined && { img_url }),
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
      },
    })) as any;
  }

  static async updateProductVariant(
    tx: any,
    id: number | string,
    { size, stock }: ProductVariantDTO
  ): Promise<ProductVariantDTO | null> {
    const db = tx || prisma;
    return await db.product_variants.update({
      where: { id: Number(id) },
      data: {
        size,
        stock,
      },
    });
  }

  static async deleteProduct(tx: any, productId: number | string): Promise<any> {
    const db = tx || prisma;
    return await db.products.update({
      where: { id: Number(productId) },
      data: {
        deleted_at: new Date(),
      },
      select: { id: true },
    });
  }

  static async deleteVariants(tx: any, productId: number | string): Promise<void> {
    const db = tx || prisma;
    await db.product_variants.updateMany({
      where: {
        product_id: Number(productId),
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
      },
    });
  }

  static async findCategories(slug: string, parentId: number | null = null): Promise<any> {
    return await prisma.categories.findFirst({
      where: {
        slug,
        parent_id: parentId,
        deleted_at: null,
      },
    });
  }

  static async getSubcategories(parentId: number): Promise<any[]> {
    return await prisma.categories.findMany({
      where: {
        parent_id: parentId,
        deleted_at: null,
      },
      orderBy: { id: "asc" },
    });
  }

  static async getProductsByCategoryId(categoryId: number): Promise<ProductResponse[]> {
    return (await prisma.products.findMany({
      where: {
        category_id: categoryId,
        deleted_at: null,
      },
      orderBy: { id: "asc" },
    })) as any;
  }

  static async getProductBySlug(slug: string): Promise<ProductResponse | null> {
    const p = await prisma.products.findFirst({
      where: { slug, deleted_at: null },
      include: {
        product_variants: {
          where: { deleted_at: null },
          select: { id: true, size: true, stock: true },
        },
      },
    });

    if (!p) return null;

    return {
      ...p,
      variants: p.product_variants,
    } as any;
  }

  static async getCategoriesById(id: number): Promise<any> {
    return await prisma.categories.findFirst({
      where: {
        id: Number(id),
        deleted_at: null,
      },
    });
  }
}
