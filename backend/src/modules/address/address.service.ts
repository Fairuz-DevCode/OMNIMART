import { AddressModel } from "./address.model.js";
import { AddressDTO, AddressResponse, UpdateAddressDTO } from "./address.types.js";
import { AppError } from "../../utils/appError.js";

export class AddressServices {
  static async createAddress(userId: number, payload: AddressDTO): Promise<AddressResponse> {
    const newAddress = await AddressModel.createAddress(userId, payload);
    return newAddress;
  }

  static async getUserAddresses(userId: number): Promise<AddressResponse[]> {
    const addresses = await AddressModel.getAddressesByUserId(userId);
    return addresses;
  }

  static async updateAddress(addressId: number | string, userId: number, payload: UpdateAddressDTO): Promise<AddressResponse> {
    const existingAddress = await AddressModel.getAddressByIdAndUserId(addressId, userId);
    if (!existingAddress) {
      throw new AppError("Address not found", 404);
    }

    const updatedAddress = await AddressModel.updateAddress(addressId, userId, payload);
    if (!updatedAddress) {
      throw new AppError("Failed to update address", 400);
    }
    return updatedAddress;
  }

  static async deleteAddress(addressId: number | string, userId: number): Promise<boolean> {
    const existingAddress = await AddressModel.getAddressByIdAndUserId(addressId, userId);
    if (!existingAddress) {
      throw new AppError("Address not found", 404);
    }

    await AddressModel.deleteAddress(addressId, userId);
    return true;
  }
}
