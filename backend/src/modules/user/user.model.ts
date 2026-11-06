import prisma from "../../config/prisma.js";
import { UserProfileResponse, UpdateProfileDTO } from "./user.types.js";

export class UserModel {
  static async getUserById(id: number): Promise<UserProfileResponse | null> {
    return await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });
  }

  static async getPasswordById(id: number): Promise<{ id: number; password: string } | null> {
    return await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        password: true,
      },
    });
  }

  static async updateProfile(id: number, { name, phone }: UpdateProfileDTO): Promise<UserProfileResponse | null> {
    return await prisma.users.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });
  }

  static async updatePassword(id: number, hashedPassword: string): Promise<any> {
    return await prisma.users.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });
  }
}
