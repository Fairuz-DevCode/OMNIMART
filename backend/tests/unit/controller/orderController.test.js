import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { AppError } from "../../../src/utils/appError.js";

jest.unstable_mockModule("../../../src/services/orderServices.js", () => ({
  orderServices: {
    createOrder: jest.fn(),
    getUserOrders: jest.fn(),
    getOrderDetail: jest.fn(),
    cancelOrder: jest.fn(),
  },
}));

const orderController = (await import("../../../src/controllers/orderController.js")).default;
const { orderServices } = await import("../../../src/services/orderServices.js");

describe("orderController Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1, role: "user" },
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("createOrder", () => {
    it("should create order and return 201", async () => {
      req.body = { address_id: 1, shipping_cost: 20000 };
      const mockOrder = { id: 10, status: "pending", total_amount: 1020000 };
      orderServices.createOrder.mockResolvedValue(mockOrder);

      await orderController.createOrder(req, res, next);

      expect(orderServices.createOrder).toHaveBeenCalledWith(1, req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Order created successfully",
        data: mockOrder,
      });
    });

    it("should call next with error if cart is empty", async () => {
      const error = new AppError("Cart is empty", 400);
      orderServices.createOrder.mockRejectedValue(error);

      await orderController.createOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getOrderHistory", () => {
    it("should return order history with 200", async () => {
      const mockOrders = [{ id: 1 }, { id: 2 }];
      orderServices.getUserOrders.mockResolvedValue(mockOrders);

      await orderController.getOrderHistory(req, res, next);

      expect(orderServices.getUserOrders).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Order history fetched successfully",
        data: mockOrders,
      });
    });
  });

  describe("getOrderDetail", () => {
    it("should return order detail with 200", async () => {
      req.params.id = "10";
      const mockDetail = { id: 10, status: "pending", items: [] };
      orderServices.getOrderDetail.mockResolvedValue(mockDetail);

      await orderController.getOrderDetail(req, res, next);

      expect(orderServices.getOrderDetail).toHaveBeenCalledWith(1, 10, "user");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Order details fetched successfully",
        data: mockDetail,
      });
    });

    it("should call next with 404 error if order not found", async () => {
      req.params.id = "999";
      const error = new AppError("Order not found", 404);
      orderServices.getOrderDetail.mockRejectedValue(error);

      await orderController.getOrderDetail(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("cancelOrder", () => {
    it("should cancel order and return 200", async () => {
      req.params.id = "10";
      const mockCancelled = { id: 10, status: "cancelled" };
      orderServices.cancelOrder.mockResolvedValue(mockCancelled);

      await orderController.cancelOrder(req, res, next);

      expect(orderServices.cancelOrder).toHaveBeenCalledWith(1, 10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Order cancelled successfully",
        data: mockCancelled,
      });
    });
  });
});
