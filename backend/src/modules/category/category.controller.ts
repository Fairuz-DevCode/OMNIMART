import { Request, Response, NextFunction } from "express";
import { CategoryService } from "./category.service.js";

export class CategoryController {
  static async createCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;
      const newCategories = await CategoryService.createCategories(payload);

      return res.status(201).json({
        status: "success",
        message: "Success created categories",
        payload: newCategories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const allCategories = await CategoryService.getAllCategories();

      return res.status(200).json({
        status: "success",
        message: "Success fetch categories",
        payload: {
          categories: allCategories,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categoriesId = req.params.id as string;
      await CategoryService.deleteCategories(categoriesId);

      return res.status(200).json({
        status: "success",
        message: "Success delete categories",
      });
    } catch (error) {
      next(error);
    }
  }
}
