import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock dependencies using unstable_mockModule
jest.unstable_mockModule("../../../src/utils/token.js", () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

jest.unstable_mockModule("../../../src/utils/password.js", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.unstable_mockModule("../../../src/modules/auth/auth.model.js", () => ({
  AuthModel: {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    saveRefreshToken: jest.fn(),
    findRefreshToken: jest.fn(),
    deleteRefreshToken: jest.fn(),
  },
}));

// Import dynamically so mocks are set up beforehand
const { AuthService } = await import("../../../src/modules/auth/auth.service.js");
const { AuthModel } = await import("../../../src/modules/auth/auth.model.js");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = await import("../../../src/utils/token.js");
const { hashPassword, comparePassword } = await import("../../../src/utils/password.js");

describe("AuthService Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should successfully register a new user", async () => {
      AuthModel.findByEmail.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedPassword123");
      AuthModel.createUser.mockResolvedValue({
        id: 1,
        name: "Test User",
        email: "test@example.com",
        role: "user",
      });
      generateAccessToken.mockReturnValue("accessToken123");
      generateRefreshToken.mockReturnValue("refreshToken123");
      AuthModel.saveRefreshToken.mockResolvedValue({});

      const result = await AuthService.registerUser({
        name: "Test User",
        email: "test@example.com",
        password: "Password1!",
      });

      expect(AuthModel.findByEmail).toHaveBeenCalledWith("test@example.com");
      expect(hashPassword).toHaveBeenCalledWith("Password1!");
      expect(AuthModel.createUser).toHaveBeenCalledWith({
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword123",
      });
      expect(generateAccessToken).toHaveBeenCalled();
      expect(generateRefreshToken).toHaveBeenCalled();
      expect(AuthModel.saveRefreshToken).toHaveBeenCalledWith(1, "refreshToken123");
      expect(result).toEqual({
        user: {
          id: 1,
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
        accessToken: "accessToken123",
        refreshToken: "refreshToken123",
      });
    });

    it("should throw an error if email is already registered", async () => {
      AuthModel.findByEmail.mockResolvedValue({ id: 1, email: "test@example.com" });

      await expect(
        AuthService.registerUser({
          name: "Test User",
          email: "test@example.com",
          password: "Password1!",
        })
      ).rejects.toThrow("Email already registered");

      expect(AuthModel.createUser).not.toHaveBeenCalled();
    });
  });

  describe("loginUser", () => {
    it("should successfully log in a user with valid credentials", async () => {
      const dbUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword123",
      };
      AuthModel.findByEmail.mockResolvedValue(dbUser);
      comparePassword.mockResolvedValue(true);
      generateRefreshToken.mockReturnValue("refreshToken123");
      AuthModel.saveRefreshToken.mockResolvedValue({});
      generateAccessToken.mockReturnValue("accessToken123");

      const result = await AuthService.loginUser({
        email: "test@example.com",
        password: "Password1!",
      });

      expect(AuthModel.findByEmail).toHaveBeenCalledWith("test@example.com");
      expect(comparePassword).toHaveBeenCalledWith("Password1!", "hashedPassword123");
      expect(generateRefreshToken).toHaveBeenCalledWith(dbUser);
      expect(AuthModel.saveRefreshToken).toHaveBeenCalledWith(1, "refreshToken123");
      expect(generateAccessToken).toHaveBeenCalledWith(dbUser);
      expect(result).toEqual({
        user: {
          id: 1,
          name: "Test User",
          email: "test@example.com",
        },
        accessToken: "accessToken123",
        refreshToken: "refreshToken123",
      });
    });

    it("should throw an error if user is not found", async () => {
      AuthModel.findByEmail.mockResolvedValue(null);

      await expect(
        AuthService.loginUser({
          email: "nonexistent@example.com",
          password: "Password1!",
        })
      ).rejects.toThrow("Invalid email or password");

      expect(comparePassword).not.toHaveBeenCalled();
    });

    it("should throw an error if password does not match", async () => {
      const dbUser = {
        id: 1,
        email: "test@example.com",
        password: "hashedPassword123",
      };
      AuthModel.findByEmail.mockResolvedValue(dbUser);
      comparePassword.mockResolvedValue(false);

      await expect(
        AuthService.loginUser({
          email: "test@example.com",
          password: "WrongPassword!",
        })
      ).rejects.toThrow("Invalid email or password");

      expect(generateRefreshToken).not.toHaveBeenCalled();
      expect(AuthModel.saveRefreshToken).not.toHaveBeenCalled();
      expect(generateAccessToken).not.toHaveBeenCalled();
    });
  });

  describe("refreshTokenServices", () => {
    it("should successfully generate a new access token", async () => {
      verifyRefreshToken.mockReturnValue({ id: 1, role: "user" });
      AuthModel.findRefreshToken.mockResolvedValue({ id: 10, token: "token123" });
      generateAccessToken.mockReturnValue("newAccessToken123");

      const result = await AuthService.refreshTokenServices("token123");

      expect(verifyRefreshToken).toHaveBeenCalledWith("token123");
      expect(AuthModel.findRefreshToken).toHaveBeenCalledWith(1, "token123");
      expect(generateAccessToken).toHaveBeenCalledWith({ id: 1, role: "user" });
      expect(result).toEqual({ accessToken: "newAccessToken123" });
    });

    it("should throw an error if refresh token verification fails", async () => {
      verifyRefreshToken.mockReturnValue(null);

      await expect(
        AuthService.refreshTokenServices("invalidtoken")
      ).rejects.toThrow("Invalid or expired refresh token");

      expect(AuthModel.findRefreshToken).not.toHaveBeenCalled();
    });

    it("should throw an error if token is not found in database", async () => {
      verifyRefreshToken.mockReturnValue({ id: 1, role: "user" });
      AuthModel.findRefreshToken.mockResolvedValue(null);

      await expect(
        AuthService.refreshTokenServices("revokedtoken")
      ).rejects.toThrow("Invalid or expired refresh token");
    });
  });

  describe("logoutUser", () => {
    it("should delete refresh token if provided", async () => {
      AuthModel.deleteRefreshToken.mockResolvedValue({});

      await AuthService.logoutUser("token123");

      expect(AuthModel.deleteRefreshToken).toHaveBeenCalledWith("token123");
    });

    it("should do nothing if token is not provided", async () => {
      await AuthService.logoutUser(undefined);

      expect(AuthModel.deleteRefreshToken).not.toHaveBeenCalled();
    });
  });
});
