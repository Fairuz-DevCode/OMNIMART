import prisma from "../../config/prisma.js";
import { ProductModel } from "./product.model.js";
import { CreateProductDTO, ProductResponse, UpdateProductDTO } from "./product.types.js";
import { AppError } from "../../utils/appError.js";

export class ProductServices {
  static async createProduct({ variants, ...productData }: CreateProductDTO): Promise<ProductResponse> {
    return await prisma.$transaction(async (tx) => {
      const newProduct = await ProductModel.createProduct(tx, productData);

      const createdVariants: any[] = [];

      if (variants && variants.length > 0) {
        const created = await Promise.all(
          variants.map((variant) => ProductModel.createVariant(tx, newProduct.id, variant))
        );
        createdVariants.push(...created);
      }

      return {
        ...newProduct,
        variants: createdVariants,
      };
    });
  }

  static async getProduct(limit = 10, offset = 0): Promise<{ products: ProductResponse[]; totalItems: number }> {
    return await ProductModel.getAllProducts(limit, offset);
  }

  static async getProductFeed(
    limit: number = 10,
    cursor?: number,
    search?: string
  ): Promise<{ products: ProductResponse[]; nextCursor: number | null }> {
    return await ProductModel.getProductsByCursor(limit, cursor, search);
  }

  static async getProductDetail(productId: number | string): Promise<ProductResponse> {
    const productDetail = await ProductModel.getProductById(productId);
    if (!productDetail) {
      throw new AppError("Product not found", 404);
    }
    return productDetail;
  }

  static async updateProduct(
    productId: number | string,
    { variants, ...productData }: UpdateProductDTO
  ): Promise<ProductResponse> {
    return await prisma.$transaction(async (tx) => {
      const updatedProduct = await ProductModel.updateProduct(tx, productId, productData);

      if (!updatedProduct) {
        throw new AppError("Product not found", 404);
      }

      const processedVariants: any[] = [];
      if (variants && variants.length > 0) {
        const processed = await Promise.all(
          variants.map((variant) => {
            if (variant.id) {
              return ProductModel.updateProductVariant(tx, variant.id, variant);
            } else {
              return ProductModel.createVariant(tx, Number(productId), variant);
            }
          })
        );
        processedVariants.push(...processed);
      }

      return {
        ...updatedProduct,
        variants: processedVariants,
      };
    });
  }

  static async deleteProduct(productId: number | string): Promise<boolean> {
    return await prisma.$transaction(async (tx) => {
      await ProductModel.deleteVariants(tx, productId);

      const deletedProduct = await ProductModel.deleteProduct(tx, productId);

      if (!deletedProduct) {
        throw new AppError("Product not found", 404);
      }

      return true;
    });
  }

  static async slugHandler(slugPathArray: string[]): Promise<any> {
    if (!slugPathArray || slugPathArray.length === 0) {
      throw new AppError("Invalid category or product path", 400);
    }

    // Optimasi N+1: Ambil semua kategori kandidat sekaligus dalam 1 query batch (WHERE slug IN (...))
    const matchingCategories = await prisma.categories.findMany({
      where: { slug: { in: slugPathArray } },
    });
    const categoryBySlug = new Map(matchingCategories.map((c) => [c.slug, c]));

    let currentParentId: number | null = null;
    const categoryHierarchy: any[] = [];
    let isCategoryHierarchyValid = true;

    for (let i = 0; i < slugPathArray.length; i++) {
      const slug = slugPathArray[i];
      const category = categoryBySlug.get(slug);
      if (category && category.parent_id === currentParentId) {
        categoryHierarchy.push(category);
        currentParentId = category.id;
      } else {
        isCategoryHierarchyValid = false;
        break;
      }
    }

    if (isCategoryHierarchyValid && categoryHierarchy.length === slugPathArray.length) {
      const targetCategory = categoryHierarchy[categoryHierarchy.length - 1];
      const subcategories = await ProductModel.getSubcategories(targetCategory.id);
      const products = await ProductModel.getProductsByCategoryId(targetCategory.id);

      return {
        type: "category",
        category: {
          ...targetCategory,
          hierarchy: categoryHierarchy,
        },
        subcategories,
        products,
        path: `/categories/${slugPathArray.join("/")}`,
      };
    }

    const lastSlug = slugPathArray[slugPathArray.length - 1];
    const product = await ProductModel.getProductBySlug(lastSlug);

    if (product) {
      const category = await ProductModel.getCategoriesById(product.category_id);

      const categoryBreadcrumbs: any[] = [];
      if (category) {
        // Optimasi N+1: Ambil hirarki kategori sekaligus menggunakan recursive CTE dalam 1 kali query via Prisma
        const hierarchyResult = await prisma.$queryRaw<any[]>`
          WITH RECURSIVE category_tree AS (
             SELECT id, name, slug, parent_id FROM categories WHERE id = ${category.id}
             UNION ALL
             SELECT c.id, c.name, c.slug, c.parent_id 
             FROM categories c
             INNER JOIN category_tree ct ON ct.parent_id = c.id
           )
           SELECT id, name, slug, parent_id FROM category_tree;
        `;
        // Hasil unshift agar urut dari root parent ke child
        categoryBreadcrumbs.push(...[...hierarchyResult].reverse());
      }

      return {
        type: "product",
        product: {
          ...product,
          category: category
            ? {
                ...category,
                path: `/categories/${categoryBreadcrumbs.map((c) => c.slug).join("/")}`,
              }
            : null,
        },
        path: `/categories/${slugPathArray.join("/")}`,
      };
    }

    throw new AppError("Category or product not found", 404);
  }
}
