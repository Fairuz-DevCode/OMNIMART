import prisma from "../../config/prisma.js";
import { AddressDTO, AddressResponse, UpdateAddressDTO } from "./address.types.js";

export class AddressModel {
  static async createAddress(
    userId: number,
    { label, phone, street_address, city, postal_code, country }: AddressDTO
  ): Promise<AddressResponse> {
    return await prisma.addresses.create({
      data: {
        user_id: userId,
        label,
        phone,
        street_address,
        city,
        postal_code,
        country,
      },
    });
  }

  static async getAddressesByUserId(userId: number): Promise<AddressResponse[]> {
    return await prisma.addresses.findMany({
      where: { user_id: userId, deleted_at: null },
      orderBy: { id: "asc" },
    });
  }

  static async getAddressByIdAndUserId(addressId: number | string, userId: number): Promise<AddressResponse | null> {
    return await prisma.addresses.findFirst({
      where: {
        id: Number(addressId),
        user_id: userId,
        deleted_at: null,
      },
    });
  }

  static async updateAddress(
    addressId: number | string,
    userId: number,
    { label, phone, street_address, city, postal_code, country }: UpdateAddressDTO
  ): Promise<AddressResponse | null> {
    const existing = await prisma.addresses.findFirst({
      where: { id: Number(addressId), user_id: userId, deleted_at: null },
    });
    if (!existing) return null;

    return await prisma.addresses.update({
      where: { id: Number(addressId) },
      data: {
        ...(label !== undefined && { label }),
        ...(phone !== undefined && { phone }),
        ...(street_address !== undefined && { street_address }),
        ...(city !== undefined && { city }),
        ...(postal_code !== undefined && { postal_code }),
        ...(country !== undefined && { country }),
      },
    });
  }

  static async deleteAddress(addressId: number | string, userId: number): Promise<any> {
    const existing = await prisma.addresses.findFirst({
      where: { id: Number(addressId), user_id: userId, deleted_at: null },
    });
    if (!existing) return null;

    // Soft delete: tandai deleted_at agar hilang dari UI pembeli namun riwayat order tetap utuh
    return await prisma.addresses.update({
      where: { id: Number(addressId) },
      data: { deleted_at: new Date() },
    });
  }
}
