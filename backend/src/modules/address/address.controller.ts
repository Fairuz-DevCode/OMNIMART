import { Request, Response, NextFunction } from "express";
import { AddressServices } from "./address.service.js";

export class AddressController {
  static async createAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const newAddress = await AddressServices.createAddress(userId, req.body);

      return res.status(200).json({
        status: "success",
        message: "Address added successfully",
        payload: newAddress,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const addresses = await AddressServices.getUserAddresses(userId);

      return res.status(200).json({
        status: "success",
        message: "User addresses fetch successfully",
        payload: addresses,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const addressId = req.params.id as string;

      const updatedAddress = await AddressServices.updateAddress(addressId, userId, req.body);

      return res.status(200).json({
        status: "success",
        message: "User address update successfully",
        payload: updatedAddress,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const addressId = req.params.id as string;

      await AddressServices.deleteAddress(addressId, userId);

      return res.status(200).json({
        status: "success",
        message: "Address deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
