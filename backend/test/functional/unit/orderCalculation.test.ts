import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Logika domain murni kalkulasi finansial & inventaris e-commerce
 */
export interface CartItem {
  id: number;
  price: number;
  quantity: number;
  weightGram: number;
}

export interface Coupon {
  code: string;
  type: "PERCENT" | "FIXED";
  discountValue: number;
  maxDiscount?: number;
  minSpend: number;
}

export const calculateSubtotal = (items: CartItem[]): number => {
  return items.reduce((acc, item) => {
    if (item.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }
    return acc + item.price * item.quantity;
  }, 0);
};

export const calculateTotalWeightInKg = (items: CartItem[]): number => {
  const totalGrams = items.reduce((acc, item) => acc + item.weightGram * item.quantity, 0);
  return Math.max(1, Math.ceil(totalGrams / 1000)); // Dibulatkan ke atas, minimal 1 kg
};

export const calculateDiscount = (subtotal: number, coupon?: Coupon): number => {
  if (!coupon) return 0;
  if (subtotal < coupon.minSpend) {
    throw new Error(`Minimum spend of Rp ${coupon.minSpend.toLocaleString()} is not met`);
  }

  if (coupon.type === "FIXED") {
    return Math.min(subtotal, coupon.discountValue);
  }

  // PERCENTAGE
  const rawDiscount = (subtotal * coupon.discountValue) / 100;
  if (coupon.maxDiscount && rawDiscount > coupon.maxDiscount) {
    return coupon.maxDiscount;
  }
  return rawDiscount;
};

export const validateStockDeduction = (currentStock: number, requestedQuantity: number): number => {
  if (requestedQuantity <= 0) {
    throw new Error("Deduction quantity must be positive");
  }
  if (currentStock < requestedQuantity) {
    throw new Error(`Insufficient stock. Available: ${currentStock}, Requested: ${requestedQuantity}`);
  }
  return currentStock - requestedQuantity;
};

describe("Functional Unit Test: Finansial & Kalkulasi Order", () => {
  const mockItems: CartItem[] = [
    { id: 1, price: 150000, quantity: 2, weightGram: 400 }, // Subtotal: 300.000, Bobot: 800g
    { id: 2, price: 200000, quantity: 1, weightGram: 500 }, // Subtotal: 200.000, Bobot: 500g
  ];

  it("1. Kalkulasi subtotal barang harus tepat", () => {
    const subtotal = calculateSubtotal(mockItems);
    assert.strictEqual(subtotal, 500000);
  });

  it("2. Menolak item jika kuantitas <= 0", () => {
    const invalidItems: CartItem[] = [{ id: 3, price: 100000, quantity: 0, weightGram: 200 }];
    assert.throws(() => calculateSubtotal(invalidItems), /Quantity must be greater than 0/);
  });

  it("3. Kalkulasi pembulatan berat ekspedisi (1300 gram -> 2 kg)", () => {
    const weightKg = calculateTotalWeightInKg(mockItems); // 800g + 500g = 1300g
    assert.strictEqual(weightKg, 2);
  });

  it("4. Kalkulasi diskon kupon persentase dengan batas maksimal (Cap)", () => {
    const coupon: Coupon = {
      code: "STREETWEAR10",
      type: "PERCENT",
      discountValue: 10, // 10% dari 500.000 = 50.000
      maxDiscount: 40000, // Tapi dibatasi maksimal 40.000
      minSpend: 200000,
    };
    const discount = calculateDiscount(500000, coupon);
    assert.strictEqual(discount, 40000);
  });

  it("5. Menolak kupon jika belanjaan kurang dari minimum spend", () => {
    const coupon: Coupon = {
      code: "VIP50",
      type: "FIXED",
      discountValue: 50000,
      minSpend: 1000000,
    };
    assert.throws(() => calculateDiscount(500000, coupon), /Minimum spend/);
  });

  it("6. Pengurangan stok berhasil dan sisa stok akurat", () => {
    const remainingStock = validateStockDeduction(10, 3);
    assert.strictEqual(remainingStock, 7);
  });

  it("7. Mencegah stok menjadi minus jika kuantitas melebihi stok", () => {
    assert.throws(() => validateStockDeduction(2, 5), /Insufficient stock/);
  });
});
