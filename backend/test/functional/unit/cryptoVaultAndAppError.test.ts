import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../../../src/utils/appError.js";
import { encryptSecret, decryptSecret } from "../../../src/utils/cryptoVault.js";

describe("Functional Unit Test: Security CryptoVault & AppError Handling", () => {
  it("1. AppError harus membedakan status 'fail' (4xx) dan 'error' (5xx)", () => {
    const notFound = new AppError("Resource not found", 404);
    assert.strictEqual(notFound.statusCode, 404);
    assert.strictEqual(notFound.status, "fail");
    assert.strictEqual(notFound.isOperational, true);

    const serverErr = new AppError("Database connection lost", 500);
    assert.strictEqual(serverErr.statusCode, 500);
    assert.strictEqual(serverErr.status, "error");
  });

  it("2. cryptoVault mengenkripsi plaintext ke format AES-256-GCM enc:v1:...", () => {
    const secret = "VERY_CONFIDENTIAL_OAUTH_TOKEN_999";
    const encrypted = encryptSecret(secret);

    assert.ok(encrypted.startsWith("enc:v1:"));
    assert.notStrictEqual(encrypted, secret);

    const decrypted = decryptSecret(encrypted);
    assert.strictEqual(decrypted, secret);
  });

  it("3. cryptoVault menolak ciphertext yang dimanipulasi (Tamper Resistance via Auth Tag)", () => {
    const secret = "SENSITIVE_SECRET";
    const encrypted = encryptSecret(secret);

    // Rusak ciphertext byte terakhir
    const tampered = encrypted.slice(0, -4) + "0000";
    assert.throws(() => decryptSecret(tampered), /Gagal mendekripsi data/);
  });
});
