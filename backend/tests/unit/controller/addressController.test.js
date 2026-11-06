import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { AppError } from "../../../src/utils/appError.js";

jest.unstable_mockModule("../../../src/services/addressServices.js", () => ({
  addressServices: {
    createAddress: jest.fn(),
    getUserAddresses: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
  },
}));

const addressController = (await import("../../../src/controllers/addressController.js")).default;
const { addressServices } = await import("../../../src/services/addressServices.js");

describe("addressController Unit Tests", () => {
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

  describe("createAddress", () => {
    it("should create address and return 200", async () => {
      req.body = {
        label: "Rumah",
        phone: "08123456789",
        street_address: "Jl. Mawar No. 1",
        city: "Surabaya",
        country: "Indonesia",
        postal_code: "60293",
      };
      const mockAddr = { id: 1, ...req.body };
      addressServices.createAddress.mockResolvedValue(mockAddr);

      await addressController.createAddress(req, res, next);

      expect(addressServices.createAddress).toHaveBeenCalledWith(1, req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Address added successfully",
        payload: mockAddr,
      });
    });

    it("should call next with error if service throws", async () => {
      const error = new Error("DB error");
      addressServices.createAddress.mockRejectedValue(error);

      await addressController.createAddress(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getAddresses", () => {
    it("should return all user addresses with 200", async () => {
      const mockAddresses = [{ id: 1, label: "Rumah" }, { id: 2, label: "Kantor" }];
      addressServices.getUserAddresses.mockResolvedValue(mockAddresses);

      await addressController.getAddresses(req, res, next);

      expect(addressServices.getUserAddresses).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "User addresses fetch successfully",
        payload: mockAddresses,
      });
    });
  });

  describe("updateAddress", () => {
    it("should update address and return 200", async () => {
      req.params.id = "1";
      req.body = { city: "Jakarta" };
      const mockUpdated = { id: 1, city: "Jakarta" };
      addressServices.updateAddress.mockResolvedValue(mockUpdated);

      await addressController.updateAddress(req, res, next);

      expect(addressServices.updateAddress).toHaveBeenCalledWith("1", 1, req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "User address update successfully",
        payload: mockUpdated,
      });
    });

    it("should call next with 404 error if address not found", async () => {
      req.params.id = "999";
      const error = new AppError("Address not found", 404);
      addressServices.updateAddress.mockRejectedValue(error);

      await addressController.updateAddress(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("deleteAddress", () => {
    it("should delete address and return 200", async () => {
      req.params.id = "1";
      addressServices.deleteAddress.mockResolvedValue(true);

      await addressController.deleteAddress(req, res, next);

      expect(addressServices.deleteAddress).toHaveBeenCalledWith("1", 1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Address deleted successfully",
      });
    });

    it("should call next with 404 error if address not found", async () => {
      req.params.id = "999";
      const error = new AppError("Address not found", 404);
      addressServices.deleteAddress.mockRejectedValue(error);

      await addressController.deleteAddress(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
