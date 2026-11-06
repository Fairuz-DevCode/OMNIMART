import { UserModel } from "./user.model.js";
import { UserProfileResponse, UpdateProfileDTO } from "./user.types.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import { AppError } from "../../utils/appError.js";

export class UserService {
  static async getUserById(userId: number): Promise<UserProfileResponse> {
    const user = await UserModel.getUserById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  static async updateUserProfile(userId: number, { name, phone }: UpdateProfileDTO): Promise<UserProfileResponse> {
    const updatedUser = await UserModel.updateProfile(userId, { name, phone });

    if (!updatedUser) {
      throw new AppError("User not found or update failed", 400);
    }

    return updatedUser;
  }

  static async changeUserPassword(
    userId: number,
    currentPassword: string,
    newPassword?: string
  ): Promise<boolean> {
    const user = await UserModel.getPasswordById(userId);
    if (!user) {
      throw new AppError("password not found", 404);
    }

    const isPasswordMatch = await comparePassword(currentPassword, user.password);
    if (!isPasswordMatch) {
      throw new AppError("password lama salah", 400);
    }

    if (!newPassword) {
      throw new AppError("password baru harus diisi", 400);
    }

    const hashedPassword = await hashPassword(newPassword);
    await UserModel.updatePassword(userId, hashedPassword);
    return true;
  }
}
