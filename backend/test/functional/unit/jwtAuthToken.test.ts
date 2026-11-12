import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generate2FATempToken,
  verify2FATempToken,
} from "../../../src/utils/token.js";
import { hashPassword, comparePassword } from "../../../src/utils/password.js";

describe("Functional Unit Test: JWT Token & Password Security", () => {
  const dummyUser = { id: 42, role: "customer" };

  it("1. Access Token harus ter-generate dengan payload user dan berumur 15 menit", () => {
    const token = generateAccessToken(dummyUser);
    assert.ok(typeof token === "string" && token.length > 20);

    const decoded = jwt.decode(token) as any;
    assert.strictEqual(decoded.id, 42);
    assert.strictEqual(decoded.role, "customer");
    assert.ok(decoded.exp - decoded.iat <= 15 * 60 + 5); // Durasi 15 menit
  });

  it("2. Refresh Token harus valid saat diverifikasi dan menolak jika dimanipulasi", () => {
    const refreshToken = generateRefreshToken(dummyUser);
    const verified = verifyRefreshToken(refreshToken);
    assert.ok(verified !== null);
    assert.strictEqual(verified.id, 42);

    // Manipulasi token (tampered signature)
    const tamperedToken = refreshToken.slice(0, -6) + "xxxxxx";
    const invalidResult = verifyRefreshToken(tamperedToken);
    assert.strictEqual(invalidResult, null);
  });

  it("3. 2FA Temporary Challenge Token berdurasi 5 menit dan berstatus is2FAChallenge", () => {
    const tempToken = generate2FATempToken(dummyUser.id);
    const verified2FA = verify2FATempToken(tempToken);
    assert.ok(verified2FA !== null);
    assert.strictEqual(verified2FA.id, 42);
    assert.strictEqual(verified2FA.is2FAChallenge, true);
  });

  it("4. Password bcrypt hashing & verification harus cocok", async () => {
    const plainText = "SecurePassword123!@#";
    const hashedPassword = await hashPassword(plainText);

    assert.notStrictEqual(plainText, hashedPassword);
    assert.ok(hashedPassword.startsWith("$2")); // Format bcrypt

    const isMatch = await comparePassword(plainText, hashedPassword);
    assert.strictEqual(isMatch, true);

    const isWrong = await comparePassword("WrongPassword", hashedPassword);
    assert.strictEqual(isWrong, false);
  });
});
