import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  updateUserPofile,
  changePassword,
  validateUpdateUser,
  validateChangePassword,
} from "../../../src/modules/user/user.validation.js";

describe("Functional Unit Test: User Profile & Password Validation Schemas", () => {
  it("1. Nomor telepon Indonesia yang valid (+62 / 08) harus lolos libphonenumber", () => {
    const validUpdate = updateUserPofile.safeParse({
      phone: "081234567890",
    });
    assert.strictEqual(validUpdate.success, true);

    const invalidUpdate = updateUserPofile.safeParse({
      phone: "12345", // Terlalu pendek, bukan no telp ID valid
    });
    assert.strictEqual(invalidUpdate.success, false);
  });

  it("2. Validasi update profile nama opsional", () => {
    const errors = validateUpdateUser({ name: "Joko Anwar" });
    assert.strictEqual(errors, null);

    const errorsWithAdmin = validateUpdateUser({ name: "admin_tester" });
    assert.ok(errorsWithAdmin !== null);
    assert.ok(errorsWithAdmin.name);
  });

  it("3. Ganti password wajib menyertakan currentPassword", () => {
    const validPayload = {
      currentPassword: "OldPassword123!",
      newPassword: "NewStrongPassword123!",
    };
    assert.strictEqual(validateChangePassword(validPayload), null);

    const missingCurrent = {
      currentPassword: "",
      newPassword: "NewStrongPassword123!",
    };
    assert.ok(validateChangePassword(missingCurrent) !== null);
  });
});
