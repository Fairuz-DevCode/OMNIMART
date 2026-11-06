import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { AppError } from "../../../src/utils/appError.js";

jest.unstable_mockModule("../../../src/services/shippingServices.js", () => ({
  shippingServices: {
    updateShippingStatus: jest.fn(),
    getShippingDetail: jest.fn(),
    confirmOrderReceived: jest.fn(),
    calculateShippingCost: jest.fn(),
  },
}));

const shippingController = (await import("../../../src/controllers/shippingController.js")).default;
const { shippingServices } = await import("../../../src/services/shippingServices.js");

describe("shippingController Unit Tests", () => {
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

  describe("updateShipping", () => {
    it("should update shipping info and return 200", async () => {
      req.params.orderId = "10";
      req.body = { courier: "JNE", tracking_number: "JNE123", shipping_status: "shipped" };
      const mockData = { courier: "JNE", tracking_number: "JNE123" };
      shippingServices.updateShippingStatus.mockResolvedValue(mockData);

      await shippingController.updateShipping(req, res, next);

      expect(shippingServices.updateShippingStatus).toHaveBeenCalledWith(10, req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Shipping information updated successfully",
        data: mockData,
      });
    });

    it("should call next with error if order not found", async () => {
      req.params.orderId = "999";
      const error = new AppError("Order not found", 404);
      shippingServices.updateShippingStatus.mockRejectedValue(error);

      await shippingController.updateShipping(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getShipping", () => {
    it("should return shipping detail with 200", async () => {
      req.params.orderId = "10";
      const mockData = { courier: "JNE", tracking_number: "JNE123" };
      shippingServices.getShippingDetail.mockResolvedValue(mockData);

      await shippingController.getShipping(req, res, next);

      expect(shippingServices.getShippingDetail).toHaveBeenCalledWith(1, 10, "user");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Shipping details fetched successfully",
        data: mockData,
      });
    });
  });

  describe("completeOrder", () => {
    it("should confirm order received and return 200", async () => {
      req.params.orderId = "10";
      const mockData = { shipping_status: "delivered", order_status: "completed" };
      shippingServices.confirmOrderReceived.mockResolvedValue(mockData);

      await shippingController.completeOrder(req, res, next);

      expect(shippingServices.confirmOrderReceived).toHaveBeenCalledWith(1, 10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Order completed successfully",
        data: mockData,
      });
    });

    it("should call next with error if order not in shipped state", async () => {
      req.params.orderId = "10";
      const error = new AppError("Order is not in shipped state", 400);
      shippingServices.confirmOrderReceived.mockRejectedValue(error);

      await shippingController.completeOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("calculateCost", () => {
    it("should calculate shipping cost and return 200", async () => {
      req.body = { origin: "Surabaya", destination: "Jakarta", weight: 1000 };
      const mockData = { cost: 15000, courier: "JNE" };
      shippingServices.calculateShippingCost.mockResolvedValue(mockData);

      await shippingController.calculateCost(req, res, next);

      expect(shippingServices.calculateShippingCost).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Shipping cost calculated successfully",
        data: mockData,
      });
    });
  });
});
