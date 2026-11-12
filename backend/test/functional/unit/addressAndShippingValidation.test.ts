import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../../../src/modules/address/address.validation.js";
import { updateShippingSchema } from "../../../src/modules/shipping/shipping.validation.js";

describe("Functional Unit Test: Address & Shipping Validation Schemas", () => {
  it("1. createAddressSchema memvalidasi alamat lengkap dan kode pos 5 digit", () => {
    const validAddress = {
      label: "Rumah",
      phone: "081234567890",
      street_address: "Jl. Sudirman No. 45",
      city: "Jakarta Selatan",
      country: "Indonesia",
      postal_code: "12190",
    };
    assert.strictEqual(createAddressSchema.safeParse(validAddress).success, true);

    const invalidPostalCode = { ...validAddress, postal_code: "ABCDE" };
    assert.strictEqual(createAddressSchema.safeParse(invalidPostalCode).success, false);

    const invalidPhone = { ...validAddress, phone: "123" };
    assert.strictEqual(createAddressSchema.safeParse(invalidPhone).success, false);
  });

  it("2. updateAddressSchema bersifat parsial (bisa update salah satu field)", () => {
    assert.strictEqual(updateAddressSchema.safeParse({ city: "Bandung" }).success, true);
    assert.strictEqual(updateAddressSchema.safeParse({}).success, true);
  });

  it("3. updateShippingSchema memvalidasi status pengiriman resmi", () => {
    const validShipping = {
      courier: "JNE",
      tracking_number: "JNE123456789",
      shipping_status: "in_transit",
    };
    assert.strictEqual(updateShippingSchema.safeParse(validShipping).success, true);

    const invalidStatus = {
      ...validShipping,
      shipping_status: "lost_in_space", // Status ngawur
    };
    assert.strictEqual(updateShippingSchema.safeParse(invalidStatus).success, false);
  });
});
