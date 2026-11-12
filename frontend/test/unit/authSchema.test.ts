import { describe, it, expect } from "vitest";
import {
  nameSchema,
  emailSchema,
  passwordSchema,
  loginSchema,
  registerSchema,
} from "../../src/modules/auth/schemas/authSchema.js";

describe("Frontend Unit Test: Client-Side Auth Validation Schemas", () => {
  describe("nameSchema", () => {
    it("menolak nama kosong atau melebihi 50 karakter", () => {
      expect(nameSchema.safeParse("").success).toBe(false);
      expect(nameSchema.safeParse("a".repeat(51)).success).toBe(false);
      expect(nameSchema.safeParse("Budi Santoso").success).toBe(true);
    });

    it("menolak nama terlarang seperti 'admin' atau 'root'", () => {
      expect(nameSchema.safeParse("admin").success).toBe(false);
      expect(nameSchema.safeParse("ROOT").success).toBe(false);
    });
  });

  describe("emailSchema", () => {
    it("memvalidasi format email RFC dan menolak email tanpa domain", () => {
      expect(emailSchema.safeParse("budi@gmail.com").success).toBe(true);
      expect(emailSchema.safeParse("budi-at-gmail.com").success).toBe(false);
    });

    it("menolak email dengan kata 'admin' atau 'root' di local-part", () => {
      expect(emailSchema.safeParse("admin@streetwear.com").success).toBe(false);
      expect(emailSchema.safeParse("superroot@streetwear.com").success).toBe(false);
    });
  });

  describe("passwordSchema", () => {
    it("menolak password yang tidak memenuhi 5 syarat kompleksitas", () => {
      // Kurang huruf besar & simbol
      const weak = passwordSchema.safeParse("secret123");
      expect(weak.success).toBe(false);
    });

    it("menerima password kuat (minimal 8 char, uppercase, lowercase, digit, symbol)", () => {
      const strong = passwordSchema.safeParse("Nexa@Pass1234");
      expect(strong.success).toBe(true);
    });
  });

  describe("loginSchema", () => {
    it("memvalidasi email dan password tidak boleh kosong", () => {
      expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
      expect(
        loginSchema.safeParse({ email: "user@test.com", password: "Password123!" }).success
      ).toBe(true);
    });
  });
});
