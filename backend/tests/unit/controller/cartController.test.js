import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { AppError } from "../../../src/utils/appError.js";

jest.unstable_mockModule("../../../src/services/cartServices.js", () => ({
  cartServices: {
    addItem: jest.fn(),
    getUserCart: jest.fn(),
    updateItemQuantity: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const cartController = (await import("../../../src/controllers/cartController.js")).default;
const { cartServices } = await import("../../../src/services/cartServices.js");

describe("cartController Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1 },
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("addItem", () => {
    it("should add item to cart and return 201", async () => {
      req.body = { product_id: 10, product_variant_id: 2, quantity: 1 };
      const mockItem = { id: 1, product_id: 10, quantity: 1 };
      cartServices.addItem.mockResolvedValue(mockItem);

      await cartController.addItem(req, res, next);

      expect(cartServices.addItem).toHaveBeenCalledWith(1, req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Item added to cart successfully",
        data: mockItem,
      });
    });

    it("should call next with error if service throws", async () => {
      const error = new AppError("Product or variant not found", 404);
      cartServices.addItem.mockRejectedValue(error);

      await cartController.addItem(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getCart", () => {
    it("should return user cart with 200", async () => {
      const mockCart = { id: 1, items: [], total_price: 0 };
      cartServices.getUserCart.mockResolvedValue(mockCart);

      await cartController.getCart(req, res, next);

      expect(cartServices.getUserCart).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "User cart fetched successfully",
        data: mockCart,
      });
    });

    it("should call next with error if service throws", async () => {
      const error = new Error("DB error");
      cartServices.getUserCart.mockRejectedValue(error);

      await cartController.getCart(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updateItemQuantity", () => {
    it("should update cart item quantity and return 200", async () => {
      req.params.id = "5";
      req.body.quantity = 3;
      const mockUpdated = { id: 5, quantity: 3 };
      cartServices.updateItemQuantity.mockResolvedValue(mockUpdated);

      await cartController.updateItemQuantity(req, res, next);

      expect(cartServices.updateItemQuantity).toHaveBeenCalledWith(1, 5, 3);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Cart item quantity updated successfully",
        data: mockUpdated,
      });
    });

    it("should call next with error if item not found", async () => {
      req.params.id = "999";
      const error = new AppError("Cart item not found", 404);
      cartServices.updateItemQuantity.mockRejectedValue(error);

      await cartController.updateItemQuantity(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("removeItem", () => {
    it("should remove cart item and return 200", async () => {
      req.params.id = "5";
      cartServices.removeItem.mockResolvedValue();

      await cartController.removeItem(req, res, next);

      expect(cartServices.removeItem).toHaveBeenCalledWith(1, 5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Item removed from cart successfully",
      });
    });

    it("should call next with error if item not found", async () => {
      req.params.id = "999";
      const error = new AppError("Cart item not found", 404);
      cartServices.removeItem.mockRejectedValue(error);

      await cartController.removeItem(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
