import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addCartItemSchema,
  updateCartItemSchema,
} from "../../../src/modules/cart/cart.validation.js";
import { createOrderSchema } from "../../../src/modules/order/order.validation.js";

describe("Functional Unit Test: Cart & Order Validation Schemas", () => {
  it("1. addCartItemSchema harus menuntut product_id, variant_id, dan quantity positif", () => {
    const valid = addCartItemSchema.safeParse({
      product_id: 1,
      product_variant_id: 2,
      quantity: 1,
    });
    assert.strictEqual(valid.success, true);

    const negativeQty = addCartItemSchema.safeParse({
      product_id: 1,
      product_variant_id: 2,
      quantity: -3,
    });
    assert.strictEqual(negativeQty.success, false);

    const zeroQty = addCartItemSchema.safeParse({
      product_id: 1,
      product_variant_id: 2,
      quantity: 0,
    });
    assert.strictEqual(zeroQty.success, false);
  });

  it("2. updateCartItemSchema hanya menerima kuantitas positif bulat", () => {
    assert.strictEqual(updateCartItemSchema.safeParse({ quantity: 5 }).success, true);
    assert.strictEqual(updateCartItemSchema.safeParse({ quantity: 1.5 }).success, false);
    assert.strictEqual(updateCartItemSchema.safeParse({ quantity: -1 }).success, false);
  });

  it("3. createOrderSchema harus mewajibkan address_id dan shipping_cost non-negatif", () => {
    const validOrder = createOrderSchema.safeParse({
      address_id: 10,
      shipping_cost: 25000,
    });
    assert.strictEqual(validOrder.success, true);

    const zeroShipping = createOrderSchema.safeParse({
      address_id: 10,
      shipping_cost: 0, // Bebas ongkir tetap non-negatif
    });
    assert.strictEqual(zeroShipping.success, true);

    const negativeShipping = createOrderSchema.safeParse({
      address_id: 10,
      shipping_cost: -5000,
    });
    assert.strictEqual(negativeShipping.success, false);
  });
});
