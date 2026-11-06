import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { AppError } from "../../../src/utils/appError.js";

jest.unstable_mockModule("../../../src/services/categoriesService.js", () => ({
  default: {
    createCategories: jest.fn(),
    getAllCategories: jest.fn(),
    deleteCategories: jest.fn(),
  },
}));

const categoriesController = (await import("../../../src/controllers/categoriesController.js")).default;
const categoriesService = (await import("../../../src/services/categoriesService.js")).default;

describe("categoriesController Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("createCategories", () => {
    it("should create category and return 201", async () => {
      req.body = { name: "Shoes", slug: "shoes" };
      const mockCat = { id: 1, name: "Shoes", slug: "shoes" };
      categoriesService.createCategories.mockResolvedValue(mockCat);

      await categoriesController.createCategories(req, res, next);

      expect(categoriesService.createCategories).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Success created categories",
        payload: mockCat,
      });
    });

    it("should call next with error if service throws", async () => {
      const error = new Error("DB error");
      categoriesService.createCategories.mockRejectedValue(error);

      await categoriesController.createCategories(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getCategories", () => {
    it("should return all categories with 200", async () => {
      const mockCats = [{ id: 1, name: "Shoes" }, { id: 2, name: "Bags" }];
      categoriesService.getAllCategories.mockResolvedValue(mockCats);

      await categoriesController.getCategories(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Success fetch categories",
        payload: mockCats,
      });
    });

    it("should call next with error if service throws", async () => {
      const error = new Error("DB error");
      categoriesService.getAllCategories.mockRejectedValue(error);

      await categoriesController.getCategories(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("deleteCategories", () => {
    it("should delete category and return 200", async () => {
      req.params.id = "1";
      categoriesService.deleteCategories.mockResolvedValue(true);

      await categoriesController.deleteCategories(req, res, next);

      expect(categoriesService.deleteCategories).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Success delete categories",
      });
    });

    it("should call next with 404 error if category not found", async () => {
      req.params.id = "999";
      const error = new AppError("Categories not found", 404);
      categoriesService.deleteCategories.mockRejectedValue(error);

      await categoriesController.deleteCategories(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
