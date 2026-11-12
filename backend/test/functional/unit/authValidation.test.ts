import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  nameSchema,
  emailSchema,
  passwordSchema,
  registerSchema,
  loginSchema,
} from "../../../src/modules/auth/auth.validation.js";

describe("Functional Unit Test: Auth Validation Schemas (Zod DTO)", () => {
  it("1. nameSchema harus meloloskan nama wajar dan menolak nama kosong / terlalu panjang", () => {
    assert.strictEqual(nameSchema.safeParse("Nexa Customer").success, true);
    assert.strictEqual(nameSchema.safeParse("").success, false);
    assert.strictEqual(nameSchema.safeParse("a".repeat(51)).success, false);
  });

  it("2. nameSchema wajib memblokir nama terlarang ('admin', 'root') via superRefine", () => {
    assert.strictEqual(nameSchema.safeParse("super admin").success, false);
    assert.strictEqual(nameSchema.safeParse("root_user").success, false);
  });

  it("3. emailSchema harus menolak format email yang cacat", () => {
    assert.strictEqual(emailSchema.safeParse("valid@nexa.com").success, true);
    assert.strictEqual(emailSchema.safeParse("invalid-email").success, false);
    assert.strictEqual(emailSchema.safeParse("@no-username.com").success, false);
  });

  it("4. passwordSchema wajib menuntut standar keamanan kuat (huruf besar, angka, simbol)", () => {
    // Valid: 8+ karakter, ada huruf besar, kecil, angka, simbol
    assert.strictEqual(passwordSchema.safeParse("ValidPass123!").success, true);

    // Invalid: kurang dari 8 karakter
    assert.strictEqual(passwordSchema.safeParse("Pass1!").success, false);

    // Invalid: tidak ada angka
    assert.strictEqual(passwordSchema.safeParse("PasswordOnly!").success, false);
  });

  it("5. registerSchema & loginSchema validasi payload komplit", () => {
    const validRegister = registerSchema.safeParse({
      name: "Budi Santoso",
      email: "budi@nexa.com",
      password: "StrongPassword123!",
    });
    assert.strictEqual(validRegister.success, true);

    const invalidLogin = loginSchema.safeParse({
      email: "not-an-email",
      password: "",
    });
    assert.strictEqual(invalidLogin.success, false);
  });
});
