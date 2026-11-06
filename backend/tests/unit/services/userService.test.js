import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock dependencies using unstable_mockModule
jest.unstable_mockModule("../../../src/utils/password.js", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.unstable_mockModule("../../../src/models/userModel.js", () => ({
  UserModel: {
    getUserById: jest.fn(),
    getPasswordById: jest.fn(),
    updateProfile: jest.fn(),
    updatePassword: jest.fn(),
  },
}));

// Import dynamically so mocks are set up beforehand
const { UserService } = await import("../../../src/services/userService.js");
const { UserModel } = await import("../../../src/models/userModel.js");
const { hashPassword, comparePassword } = await import("../../../src/utils/password.js");

describe("UserService Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserById", () => {
    it("should return the user details if found", async () => {
      const mockUser = { id: 1, name: "Alice", email: "alice@example.com", phone: "0812345" };
      UserModel.getUserById.mockResolvedValue(mockUser);

      const result = await UserService.getUserById(1);

      expect(UserModel.getUserById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it("should throw an error if the user is not found", async () => {
      UserModel.getUserById.mockResolvedValue(null);

      await expect(UserService.getUserById(99)).rejects.toThrow("User not found");
      expect(UserModel.getUserById).toHaveBeenCalledWith(99);
    });
  });

  describe("updateUserProfile", () => {
    it("should return updated user details upon successful update", async () => {
      const updatedMock = { id: 1, name: "Alice Updated", phone: "08987654321" };
      UserModel.updateProfile.mockResolvedValue(updatedMock);

      const result = await UserService.updateUserProfile(1, {
        name: "Alice Updated",
        phone: "08987654321",
      });

      expect(UserModel.updateProfile).toHaveBeenCalledWith(1, {
        name: "Alice Updated",
        phone: "08987654321",
      });
      expect(result).toEqual(updatedMock);
    });

    it("should throw an error if the update fails or user is not found", async () => {
      UserModel.updateProfile.mockResolvedValue(null);

      await expect(
        UserService.updateUserProfile(1, { name: "Fail" })
      ).rejects.toThrow("User not found or update failed");
    });
  });

  describe("changeUserPassword", () => {
    it("should successfully update password if current password is correct", async () => {
      UserModel.getPasswordById.mockResolvedValue({ id: 1, password: "oldHashedPassword" });
      comparePassword.mockResolvedValue(true);
      hashPassword.mockResolvedValue("newHashedPassword");
      UserModel.updatePassword.mockResolvedValue({});

      const result = await UserService.changeUserPassword(1, "OldPass1!", "NewPass1!");

      expect(UserModel.getPasswordById).toHaveBeenCalledWith(1);
      expect(comparePassword).toHaveBeenCalledWith("OldPass1!", "oldHashedPassword");
      expect(hashPassword).toHaveBeenCalledWith("NewPass1!");
      expect(UserModel.updatePassword).toHaveBeenCalledWith(1, "newHashedPassword");
      expect(result).toBe(true);
    });

    it("should throw an error if the password record is not found in database", async () => {
      UserModel.getPasswordById.mockResolvedValue(null);

      await expect(
        UserService.changeUserPassword(1, "OldPass1!", "NewPass1!")
      ).rejects.toThrow("password not found");

      expect(comparePassword).not.toHaveBeenCalled();
    });

    it("should throw an error if current password comparison fails", async () => {
      UserModel.getPasswordById.mockResolvedValue({ id: 1, password: "oldHashedPassword" });
      comparePassword.mockResolvedValue(false);

      await expect(
        UserService.changeUserPassword(1, "WrongPass1!", "NewPass1!")
      ).rejects.toThrow("password lama salah");

      expect(hashPassword).not.toHaveBeenCalled();
      expect(UserModel.updatePassword).not.toHaveBeenCalled();
    });
  });
});
