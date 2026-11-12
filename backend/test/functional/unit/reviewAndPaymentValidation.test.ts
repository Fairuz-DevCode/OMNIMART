import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createReviewSchema } from "../../../src/modules/review/review.validation.js";
import { createPaymentSchema } from "../../../src/modules/payment/payment.validation.js";

describe("Functional Unit Test: Review & Payment Validation Schemas", () => {
  it("1. createReviewSchema menerima rating 1 sampai 5 dan komentar valid", () => {
    assert.strictEqual(createReviewSchema.safeParse({ rating: 5, comment: "Keren banget!" }).success, true);
    assert.strictEqual(createReviewSchema.safeParse({ rating: 1 }).success, true); // Komentar opsional

    // Invalid: rating 0 atau 6
    assert.strictEqual(createReviewSchema.safeParse({ rating: 0 }).success, false);
    assert.strictEqual(createReviewSchema.safeParse({ rating: 6 }).success, false);

    // Invalid: komentar > 500 karakter
    assert.strictEqual(createReviewSchema.safeParse({ rating: 5, comment: "A".repeat(501) }).success, false);
  });

  it("2. createPaymentSchema memvalidasi order_id integer dan tipe pembayaran", () => {
    const valid = createPaymentSchema.safeParse({
      order_id: 101,
      payment_type: "bank_transfer",
    });
    assert.strictEqual(valid.success, true);

    const missingType = createPaymentSchema.safeParse({
      order_id: 101,
      payment_type: "",
    });
    assert.strictEqual(missingType.success, false);
  });
});
