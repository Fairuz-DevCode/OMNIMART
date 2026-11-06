import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { AppError } from "../../../src/utils/appError.js";

jest.unstable_mockModule("../../../src/services/paymentServices.js", () => ({
  paymentServices: {
    createPayment: jest.fn(),
    processNotification: jest.fn(),
    getPaymentDetail: jest.fn(),
  },
}));

const paymentController = (await import("../../../src/controllers/paymentController.js")).default;
const { paymentServices } = await import("../../../src/services/paymentServices.js");

describe("paymentController Unit Tests", () => {
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

  describe("createPayment", () => {
    it("should create payment and return 201", async () => {
      req.body = { order_id: 10, payment_type: "gopay" };
      const mockPayment = {
        order_id: 10,
        transaction_status: "pending",
        payment_url: "https://payment.url",
      };
      paymentServices.createPayment.mockResolvedValue(mockPayment);

      await paymentController.createPayment(req, res, next);

      expect(paymentServices.createPayment).toHaveBeenCalledWith(1, req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Payment transaction created successfully",
        data: mockPayment,
      });
    });

    it("should call next with error if order not found", async () => {
      const error = new AppError("Order not found", 404);
      paymentServices.createPayment.mockRejectedValue(error);

      await paymentController.createPayment(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("handleNotification", () => {
    it("should process webhook notification and return 200", async () => {
      req.body = { order_id: "ORD-001", transaction_status: "settlement" };
      paymentServices.processNotification.mockResolvedValue();

      await paymentController.handleNotification(req, res, next);

      expect(paymentServices.processNotification).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Payment notification processed successfully",
      });
    });

    it("should call next with error if processing fails", async () => {
      const error = new Error("Invalid notification");
      paymentServices.processNotification.mockRejectedValue(error);

      await paymentController.handleNotification(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getPaymentByOrder", () => {
    it("should return payment detail with 200", async () => {
      req.params.orderId = "10";
      const mockDetail = { order_id: 10, status: "paid" };
      paymentServices.getPaymentDetail.mockResolvedValue(mockDetail);

      await paymentController.getPaymentByOrder(req, res, next);

      expect(paymentServices.getPaymentDetail).toHaveBeenCalledWith(1, 10, "user");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Payment details fetched successfully",
        data: mockDetail,
      });
    });

    it("should call next with 404 error if payment not found", async () => {
      req.params.orderId = "999";
      const error = new AppError("Payment not found", 404);
      paymentServices.getPaymentDetail.mockRejectedValue(error);

      await paymentController.getPaymentByOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
