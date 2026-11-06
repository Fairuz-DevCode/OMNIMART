import { describe, it, expect } from "@jest/globals";
import {
  validateUpdateUser,
  validateChangePassword,
} from "../../../src/validations/userValidation.js";

describe("User Validation Unit Tests", () => {
  describe("validateUpdateUser", () => {
    it("should return null for valid update input with both name and phone", () => {
      const input = {
        name: "Jane Doe",
        phone: "+628123456789",
      };
      const result = validateUpdateUser(input);
      expect(result).toBeNull();
    });

    it("should return null for valid update input with only name", () => {
      const input = {
        name: "Jane Doe",
      };
      const result = validateUpdateUser(input);
      expect(result).toBeNull();
    });

    it("should return null for valid update input with only phone", () => {
      const input = {
        phone: "08123456789",
      };
      const result = validateUpdateUser(input);
      expect(result).toBeNull();
    });

    it("should return null for empty body (since both are optional)", () => {
      const input = {};
      const result = validateUpdateUser(input);
      expect(result).toBeNull();
    });

    it("should fail when phone number is invalid for Indonesia", () => {
      const input = {
        phone: "12345",
      };
      const result = validateUpdateUser(input);
      expect(result).not.toBeNull();
      expect(result.phone).toContain("Nomer telpon tidak valid untuk wilayah indonesia");
    });

    it("should fail when name contains forbidden words", () => {
      const input = {
        name: "admin",
      };
      const result = validateUpdateUser(input);
      expect(result).not.toBeNull();
      expect(result.name[0]).toContain("Nama tidak boleh mengandung kata admin");
    });
  });

  describe("validateChangePassword", () => {
    it("should return null for valid change password input", () => {
      const input = {
        currentPassword: "OldPassword1!",
        newPassword: "NewPassword1!",
      };
      const result = validateChangePassword(input);
      expect(result).toBeNull();
    });

    it("should fail when currentPassword is empty", () => {
      const input = {
        currentPassword: "",
        newPassword: "NewPassword1!",
      };
      const result = validateChangePassword(input);
      expect(result).not.toBeNull();
      expect(result.currentPassword[0]).toContain("Password lama wajib diisi");
    });

    it("should fail when newPassword does not meet password requirements", () => {
      const input = {
        currentPassword: "OldPassword1!",
        newPassword: "short",
      };
      const result = validateChangePassword(input);
      expect(result).not.toBeNull();
      expect(result.newPassword[0]).toContain("Password harus :");
    });
  });
});
