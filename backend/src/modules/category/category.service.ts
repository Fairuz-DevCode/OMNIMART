import { CategoryModel } from "./category.model.js";
import { CreateCategoryDTO, CategoryResponse } from "./category.types.js";
import { AppError } from "../../utils/appError.js";

export class CategoryService {
  static async createCategories({
    parent_id,
    parent_slug,
    ...categoriesData
  }: CreateCategoryDTO): Promise<CategoryResponse> {
    let parentId = parent_id || null;

    if (!parentId && parent_slug) {
      const parentCategories = await CategoryModel.getCategoryBySlug(parent_slug);
      if (parentCategories) {
        parentId = parentCategories.id;
      }
    }

    const newCategories = await CategoryModel.createCategories({
      name: categoriesData.name,
      slug: categoriesData.slug,
      parent_id: parentId,
    });

    if (!newCategories) {
      throw new AppError("Failed to create category", 400);
    }

    return newCategories;
  }

  static async getAllCategories(): Promise<CategoryResponse[]> {
    const categories = await CategoryModel.getAllCategories();
    return categories;
  }

  static async deleteCategories(categoriesId: number | string): Promise<boolean> {
    const existingCategories = await CategoryModel.getCategoriesById(categoriesId);
    if (!existingCategories) {
      throw new AppError("Categories not found", 404);
    }
    await CategoryModel.deleteCategories(categoriesId);
    return true;
  }
}
