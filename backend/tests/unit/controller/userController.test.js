import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { AppError } from "../../../src/utils/appError.js";

// Mock dependencies using unstable_mockModule
jest.unstable_mockModule("../../../src/services/userService.js", () => ({
  UserService: {
    getUserById: jest.fn(),
    updateUserProfile: jest.fn(),
    changeUserPassword: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../src/validations/userValidation.js", () => ({
  validateUpdateUser: jest.fn(),
  validateChangePassword: jest.fn(),
}));

// Dynamically import under test and mocked modules
const { UserController } = await import("../../../src/controllers/userController.js");
const { UserService } = await import("../../../src/services/userService.js");
const { validateUpdateUser, validateChangePassword } = await import("../../../src/validations/userValidation.js");

describe("UserController Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1 },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("getProfile", () => {
    it("should return profile details successfully with 200", async () => {
      const mockUser = { id: 1, name: "Alice", email: "alice@example.com" };
      UserService.getUserById.mockResolvedValue(mockUser);

      await UserController.getProfile(req, res, next);

      expect(UserService.getUserById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "User profile fetched successfully",
        data: mockUser,
      });
    });

    it("should call next with 404 AppError if user is not found", async () => {
      UserService.getUserById.mockResolvedValue(null);

      await UserController.getProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(404);
      expect(next.mock.calls[0][0].message).toBe("User not found");
    });

    it("should call next with error on unexpected errors", async () => {
      const error = new Error("Database offline");
      UserService.getUserById.mockRejectedValue(error);

      await UserController.getProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updateProfile", () => {
    it("should update profile successfully with 200", async () => {
      req.body = { name: "Alice Updated", phone: "+628123456789" };
      validateUpdateUser.mockReturnValue(null);
      const updatedMock = { id: 1, name: "Alice Updated", phone: "+628123456789" };
      UserService.updateUserProfile.mockResolvedValue(updatedMock);

      await UserController.updateProfile(req, res, next);

      expect(validateUpdateUser).toHaveBeenCalledWith(req.body);
      expect(UserService.updateUserProfile).toHaveBeenCalledWith(1, {
        name: "Alice Updated",
        phone: "+628123456789",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "User profile updated successfully",
        data: updatedMock,
      });
    });

    it("should call next with 422 AppError if validateUpdateUser fails", async () => {
      req.body = { phone: "invalid" };
      const validationError = "Nomer telpon tidak valid";
      validateUpdateUser.mockReturnValue(validationError);

      await UserController.updateProfile(req, res, next);

      expect(validateUpdateUser).toHaveBeenCalledWith(req.body);
      expect(UserService.updateUserProfile).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(422);
    });

    it("should call next with 400 AppError if neither name nor phone is provided", async () => {
      req.body = {};
      validateUpdateUser.mockReturnValue(null);

      await UserController.updateProfile(req, res, next);

      expect(UserService.updateUserProfile).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(400);
      expect(next.mock.calls[0][0].message).toBe("setidaknya 1 harus di rubah");
    });

    it("should call next with error on unexpected errors during update", async () => {
      req.body = { name: "Alice" };
      validateUpdateUser.mockReturnValue(null);
      const error = new Error("Service error");
      UserService.updateUserProfile.mockRejectedValue(error);

      await UserController.updateProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("changePassword", () => {
    it("should change password successfully with 200", async () => {
      req.body = { currentPassword: "OldPassword1!", newPassword: "NewPassword1!" };
      validateChangePassword.mockReturnValue(null);
      UserService.changeUserPassword.mockResolvedValue(true);

      await UserController.changePassword(req, res, next);

      expect(validateChangePassword).toHaveBeenCalledWith(req.body);
      expect(UserService.changeUserPassword).toHaveBeenCalledWith(
        1,
        "OldPassword1!",
        "NewPassword1!"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Password berhasil dirubah",
      });
    });

    it("should call next with 422 AppError if validateChangePassword fails", async () => {
      req.body = { currentPassword: "", newPassword: "short" };
      const validationError = "Password lama wajib diisi";
      validateChangePassword.mockReturnValue(validationError);

      await UserController.changePassword(req, res, next);

      expect(validateChangePassword).toHaveBeenCalledWith(req.body);
      expect(UserService.changeUserPassword).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(422);
    });

    it("should call next with 400 AppError if currentPassword or newPassword is missing in body", async () => {
      req.body = { currentPassword: "Old" }; // newPassword missing
      validateChangePassword.mockReturnValue(null);

      await UserController.changePassword(req, res, next);

      expect(UserService.changeUserPassword).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(400);
    });

    it("should call next with error on password service errors", async () => {
      req.body = { currentPassword: "OldPassword1!", newPassword: "NewPassword1!" };
      validateChangePassword.mockReturnValue(null);
      const error = new Error("password lama salah");
      UserService.changeUserPassword.mockRejectedValue(error);

      await UserController.changePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
