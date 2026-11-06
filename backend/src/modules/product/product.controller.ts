import { Request, Response, NextFunction } from "express";
import { ProductServices } from "./product.service.js";

export class ProductController {
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const rawBody = req.body;
      const payload: any = {};
      for (const [key, value] of Object.entries(rawBody)) {
        payload[key.trim()] = value;
      }

      if (req.file && (req.file as any).savedPath) {
        payload.img_url = (req.file as any).savedPath;
      }

      if (payload.variants && typeof payload.variants === "string") {
        try {
          payload.variants = JSON.parse(payload.variants);
        } catch {
          return res.status(400).json({
            status: "error",
            message: "Format variants tidak valid. Harus berupa JSON array.",
          });
        }
      }

      const newProduct = await ProductServices.createProduct(payload);

      return res.status(201).json({
        status: "success",
        message: "Success created product",
        payload: newProduct,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const cursor = req.query.cursor ? parseInt(req.query.cursor as string, 10) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      // Jika ada kursor atau search, gunakan Cursor-based pagination + PostgreSQL Trigram FTS
      if (cursor !== undefined || req.query.cursor === "" || search !== undefined) {
        const feed = await ProductServices.getProductFeed(limit, cursor, search);
        return res.status(200).json({
          status: "success",
          message: "Success fetch product feed (cursor)",
          payload: feed.products,
          pagination: {
            limit,
            nextCursor: feed.nextCursor,
            hasMore: feed.nextCursor !== null,
          },
        });
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const offset = (page - 1) * limit;

      const allProduct = await ProductServices.getProduct(limit, offset);

      return res.status(200).json({
        status: "success",
        message: "Success fetch product list",
        payload: allProduct,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProductDetail(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const productId = req.params.id as string;

      if (!/^\d+$/.test(productId)) {
        return ProductController.getBySlugPath(req, res, next);
      }

      const productDetail = await ProductServices.getProductDetail(productId);

      return res.status(200).json({
        status: "success",
        message: "Success fetch product detail",
        payload: productDetail,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      const payload = req.body;

      if (req.file && (req.file as any).savedPath) {
        payload.img_url = (req.file as any).savedPath;
      }

      const updatedProduct = await ProductServices.updateProduct(productId, payload);

      return res.status(200).json({
        status: "success",
        message: "Success update product",
        payload: updatedProduct,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id as string;
      await ProductServices.deleteProduct(productId);

      return res.status(200).json({
        status: "success",
        message: "Success delete product",
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBySlugPath(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const slugPath = req.params.slugPath || (req.params as any)[0];
      let slugPathArray: string[] = [];

      if (Array.isArray(slugPath)) {
        slugPathArray = slugPath.map((s: string) => decodeURIComponent(s).trim()).filter(Boolean);
      } else if (typeof slugPath === "string") {
        slugPathArray = slugPath.split("/").map((s: string) => decodeURIComponent(s).trim()).filter(Boolean);
      } else if (req.params.id) {
        const idStr = req.params.id as string;
        slugPathArray = idStr.split("/").map((s: string) => decodeURIComponent(s).trim()).filter(Boolean);
      } else {
        const rawPath = (req.path).replace(/^\/api\/products\/?/, "").replace(/^\/+|\/+$/g, "");
        slugPathArray = rawPath ? rawPath.split("/").map((s: string) => decodeURIComponent(s).trim()).filter(Boolean) : [];
      }

      if (slugPathArray.length === 0) {
        return res.status(400).json({ status: "fail", message: "Invalid path" });
      }

      const result = await ProductServices.slugHandler(slugPathArray);

      return res.status(200).json({
        status: "success",
        message: `Success fetch ${result.type} detail`,
        payload: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
