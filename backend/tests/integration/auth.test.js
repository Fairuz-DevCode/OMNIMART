import { AppError } from "../../src/utils/appError.js";
import "dotenv/config";
import {
  describe,
  it,
  expect,
  afterEach,
  jest,
} from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import { AuthService } from "../../src/modules/auth/auth.service.js";
import { date, email } from "zod";
import { getExtPrefix } from "libphonenumber-js";

describe("AUTH API AUTOMATED TESTING", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("REGISTER", () => {
    it("201 Register succes ", async () => {
      const uniqeEmail = `user_${Date.now()}@gmail.com`;
      const res = await request(app)
        .post("/api/auth/register")
        .set("Content-type", "application/json")
        .send({
          name: "user",
          email: uniqeEmail,
          password: "User1$$$",
        });

      expect(res.statusCode).toEqual(201);

      expect(res.body).toEqual({
        status: "success",
        message: "Registration Succes",
        payload: {
          user: {
            id: expect.any(Number), // ID pasti angka
            name: "user",
            email: uniqeEmail,
            role: "user",
          },
          accessToken: expect.any(String), // Token pasti string
        },
      });
    });

    it("400 Malformed JSON", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "application/json")
        .send('{"name": "user", "email": }');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({
        status: "fail",
        message: "Malformed JSON in request body",
        errors: null,
      });
    });

    it("409 Conflict Duplicate Email ", async () => {
      jest
        .spyOn(AuthService, "registerUser")
        .mockRejectedValue(
          new AppError("Email already registered", 409),
        );

      const res = await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "application/json")
        .send({
          name: "user",
          email: "emailExisting@gmail.com",
          password: "User1$$$$",
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body).toEqual({
        status: "fail",
        message: "Email already registered",
        errors: null,
      });
    });

    it("422 Zod validation", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "application/json")
        .send({
          name: "",
          email: "invalid@gmail.com",
          password: "123",
        });

      expect(res.statusCode).toEqual(422);
      expect(res.body.status).toEqual("fail");
      expect(res.body.message).toEqual("Validation failed");
      expect(res.body.errors).toEqual(expect.any(Object));
    });

    it("500 Server", async () => {
      jest
        .spyOn(AuthService, "registerUser")
        .mockRejectedValue(new Error("Database Crash"));

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "user",
          email: "fail@gmail.com",
          password: "User1$$$",
        });

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({
        status: "error",
        message: "Database Crash",
        errors: null,
      });
    });
  });

  describe("LOGIN", () => {
    it("200 Login Succes ", async () => {
      jest
        .spyOn(AuthService, "loginUser")
        .mockResolvedValue({
          user: {
            id: 1,
            name: "user",
            email: "user@gmail.com",
            role: "user",
          },
          accessToken: "eyJhbGciOi...",
          refreshToken: "eyJhbGciOiRef...",
        });

      const res = await request(app)
        .post("/api/auth/login")
        .set("content-type", "application/json")
        .send({
          email: "user@gmail.com",
          password: "User1$$$",
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        status: "success",
        message: "Login successful",
        payload: {
          user: {
            id: 1,
            name: "user",
            email: "user@gmail.com",
            role: "user",
          },
          accessToken: "eyJhbGciOi...",
        },
      });
    });

    it("400 Malformed JSON", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send('{"name": "user", "email": }');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({
        status: "fail",
        message: "Malformed JSON in request body",
        errors: null,
      });
    });

    it("401 Invalid Email or Password", async () => {
      jest
        .spyOn(AuthService, "loginUser")
        .mockRejectedValue(new AppError("Invalid email or password", 401));

      const res = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send({
          email: "user@gmail.com",
          password: "User1$$$",
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toEqual({
        status: "fail",
        message: "Invalid email or password",
        errors: null,
      });
    });

    it("422 Zod validation", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send({
          email: "not-an-email",
          password: "123",
        });

      expect(res.statusCode).toEqual(422);
      expect(res.body.status).toEqual("fail");
      expect(res.body.message).toEqual("Validation failed");
      expect(res.body.errors).toEqual(expect.any(Object));
    });

    it("500 Server", async () => {
      jest
        .spyOn(AuthService, "loginUser")
        .mockRejectedValue(new Error("Database Crash"));

      const res = await request(app)
        .post("/api/auth/login")
        .set("content-type", "application/json")
        .send({
          email: "fail@gmail.com",
          password: "User1$$$",
        });

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({
        status: "error",
        message: "Database Crash",
        errors: null,
      });
    });
  });

  describe("REFRESH", () => {
    it("200 success", async () => {
      jest
        .spyOn(AuthService, "refreshTokenServices")
        .mockResolvedValue({ accessToken: "newAccessToken123" });

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", ["refreshToken=mockedRefreshToken"]);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        status: "success",
        message: "Access token refreshed successfully",
        payload: {
          accessToken: "newAccessToken123",
        },
      });
    });

    it("401 missing refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/refresh");

      expect(res.statusCode).toEqual(401);
      expect(res.body).toEqual({
        status: "fail",
        message: "Refresh token missing or invalid",
        errors: "Invalid or expired refresh token",
      });
    });

    it("401 invalid refresh token (service rejection)", async () => {
      jest
        .spyOn(AuthService, "refreshTokenServices")
        .mockRejectedValue(new AppError("Invalid or expired refresh token", 401));

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", ["refreshToken=invalidToken"]);

      expect(res.statusCode).toEqual(401);
      expect(res.body).toEqual({
        status: "fail",
        message: "Invalid or expired refresh token",
        errors: null,
      });
    });

    it("500 internal server error", async () => {
      jest
        .spyOn(AuthService, "refreshTokenServices")
        .mockRejectedValue(new Error("Database connection lost"));

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", ["refreshToken=token123"]);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({
        status: "error",
        message: "Database connection lost",
        errors: null,
      });
    });
  });

  describe("LOGOUT", () => {
    it("200 success", async () => {
      jest
        .spyOn(AuthService, "logoutUser")
        .mockResolvedValue();

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", ["refreshToken=mockedRefreshToken"]);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        status: "success",
        message: "Logout successful",
      });
      // Check that the refresh token cookie was cleared
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.headers["set-cookie"][0]).toContain("refreshToken=");
    });

    it("401 missing refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/logout");

      expect(res.statusCode).toEqual(401);
      expect(res.body).toEqual({
        status: "fail",
        message: "Unauthorized access",
        errors: "User not authenticated or session already expired",
      });
    });

    it("500 internal server error", async () => {
      jest
        .spyOn(AuthService, "logoutUser")
        .mockRejectedValue(new Error("Database crash"));

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", ["refreshToken=token123"]);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({
        status: "error",
        message: "Database crash",
        errors: null,
      });
    });
  });
});

