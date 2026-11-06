import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { AppError } from "../../../src/utils/appError.js";

// Mock dependencies using unstable_mockModule
jest.unstable_mockModule("../../../src/services/authService.js", () => ({
  AuthService: {
    registerUser: jest.fn(),
    loginUser: jest.fn(),
    refreshTokenServices: jest.fn(),
    logoutUser: jest.fn(),
  },
}));

// Import dynamically so mocks are set up beforehand
const { AuthController } = await import("../../../src/controllers/authController.js");
const { AuthService } = await import("../../../src/services/authService.js");

describe("AuthController Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      cookies: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    next = jest.fn();
  });

  describe("register", () => {
    it("should register successfully and return 201", async () => {
      req.body = { name: "Alice", email: "alice@example.com", password: "Password1!" };
      AuthService.registerUser.mockResolvedValue({
        user: { id: 1, name: "Alice", email: "alice@example.com" },
        accessToken: "access123",
        refreshToken: "refresh123",
      });

      await AuthController.register(req, res, next);

      expect(AuthService.registerUser).toHaveBeenCalledWith(req.body);
      expect(res.cookie).toHaveBeenCalledWith("refreshToken", "refresh123", expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Registration Succes",
        payload: {
          user: { id: 1, name: "Alice", email: "alice@example.com" },
          accessToken: "access123",
        },
      });
    });

    it("should call next with error if service throws", async () => {
      req.body = { name: "Alice", email: "alice@example.com", password: "Password1!" };
      const error = new Error("Email already registered");
      AuthService.registerUser.mockRejectedValue(error);

      await AuthController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("login", () => {
    it("should log in successfully and return 200", async () => {
      req.body = { email: "alice@example.com", password: "Password1!" };
      AuthService.loginUser.mockResolvedValue({
        user: { id: 1, name: "Alice", email: "alice@example.com" },
        accessToken: "access123",
        refreshToken: "refresh123",
      });

      await AuthController.login(req, res, next);

      expect(AuthService.loginUser).toHaveBeenCalledWith({ email: "alice@example.com", password: "Password1!" });
      expect(res.cookie).toHaveBeenCalledWith("refreshToken", "refresh123", expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Login successful",
        payload: {
          user: { id: 1, name: "Alice", email: "alice@example.com" },
          accessToken: "access123",
        },
      });
    });

    it("should call next with error if login fails", async () => {
      req.body = { email: "alice@example.com", password: "WrongPassword!" };
      const error = new Error("Invalid email or password");
      AuthService.loginUser.mockRejectedValue(error);

      await AuthController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("refresh", () => {
    it("should refresh access token and return 200", async () => {
      req.cookies = { refreshToken: "validRefreshToken" };
      AuthService.refreshTokenServices.mockResolvedValue({
        accessToken: "newAccess123",
      });

      await AuthController.refresh(req, res, next);

      expect(AuthService.refreshTokenServices).toHaveBeenCalledWith("validRefreshToken");
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Access token refreshed successfully",
        payload: {
          accessToken: "newAccess123",
        },
      });
    });

    it("should call next with 401 AppError if refresh token cookie is missing", async () => {
      req.cookies = {};

      await AuthController.refresh(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe("Refresh token missing or invalid");
    });

    it("should call next with error if service throws", async () => {
      req.cookies = { refreshToken: "invalidRefreshToken" };
      const error = new Error("Invalid or expired refresh token");
      AuthService.refreshTokenServices.mockRejectedValue(error);

      await AuthController.refresh(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("logout", () => {
    it("should clear cookie and return 200", async () => {
      req.cookies = { refreshToken: "validRefreshToken" };
      AuthService.logoutUser.mockResolvedValue();

      await AuthController.logout(req, res, next);

      expect(AuthService.logoutUser).toHaveBeenCalledWith("validRefreshToken");
      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        message: "Logout successful",
      });
    });

    it("should call next with 401 AppError if refresh token is missing", async () => {
      req.cookies = {};

      await AuthController.logout(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    it("should call next with error if logout service fails", async () => {
      req.cookies = { refreshToken: "validRefreshToken" };
      const error = new Error("Database error");
      AuthService.logoutUser.mockRejectedValue(error);

      await AuthController.logout(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
