import prisma from "../../config/prisma.js";
import { CategoryResponse } from "./category.types.js";

export class CategoryModel {
  static async createCategories({
    name,
    slug,
    parent_id = null,
  }: {
    name: string;
    slug: string;
    parent_id?: number | null;
  }): Promise<CategoryResponse> {
    return await prisma.categories.create({
      data: {
        name,
        slug,
        parent_id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parent_id: true,
      },
    });
  }

  static async getCategoryBySlug(slug: string): Promise<CategoryResponse | null> {
    return await prisma.categories.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        parent_id: true,
      },
    });
  }

  static async getAllCategories(): Promise<CategoryResponse[]> {
    return await prisma.categories.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        parent_id: true,
      },
    });
  }

  static async getCategoriesById(id: number | string): Promise<CategoryResponse | null> {
    return await prisma.categories.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        slug: true,
        parent_id: true,
      },
    });
  }

  static async deleteCategories(id: number | string): Promise<any> {
    return await prisma.categories.delete({
      where: { id: Number(id) },
      select: { id: true },
    });
  }
}
