import { describe, it, expect } from "@jest/globals";
import { registerSchema, loginSchema } from "../../../src/validations/authValidation.js";

describe("Auth Validation Unit Tests", () => {
  describe("registerSchema", () => {
    it("should return success for valid registration input", () => {
      const input = {
        name: "John Doe",
        email: "john.doe@example.com",
        password: "Password1!",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should fail when name is empty", () => {
      const input = {
        name: "",
        email: "john.doe@example.com",
        password: "Password1!",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Nama tidak boleh kosong");
    });

    it("should fail when name contains forbidden words", () => {
      const input = {
        name: "Administrator User",
        email: "john.doe@example.com",
        password: "Password1!",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Nama tidak boleh mengandung kata admin");
    });

    it("should fail when email is invalid", () => {
      const input = {
        name: "John Doe",
        email: "invalid-email",
        password: "Password1!",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Format email tidak valid");
    });

    it("should fail when email contains forbidden word in local part", () => {
      const input = {
        name: "John Doe",
        email: "root_user@example.com",
        password: "Password1!",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Email tidak boleh mengandung kata root");
    });

    it("should fail when password does not meet complexity requirements", () => {
      const input = {
        name: "John Doe",
        email: "john.doe@example.com",
        password: "123", // too short, no uppercase, no lowercase, no special char
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Password harus :");
    });
  });

  describe("loginSchema", () => {
    it("should return success for valid login input", () => {
      const input = {
        email: "john.doe@example.com",
        password: "Password1!",
      };
      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should fail when email is empty", () => {
      const input = {
        email: "",
        password: "Password1!",
      };
      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Email tidak boleh kosong");
    });

    it("should fail when password is empty", () => {
      const input = {
        email: "john.doe@example.com",
        password: "",
      };
      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Password tidak boleh kosong");
    });
  });
});
