import { describe, it, expect } from "vitest";
import { getImageUrl } from "../../src/shared/utils/imageUrl.js";

describe("Frontend Unit Test: Image URL Utility (imageUrl.ts)", () => {
  const fallbackUrl = "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&q=80";

  it("1. Mengembalikan fallback URL jika input bernilai null, undefined, atau string kosong", () => {
    expect(getImageUrl(null)).toBe(fallbackUrl);
    expect(getImageUrl(undefined)).toBe(fallbackUrl);
    expect(getImageUrl("")).toBe(fallbackUrl);
  });

  it("2. Mempertahankan URL absolut eksternal (http/https atau data:uri)", () => {
    const external = "https://cdn.example.com/streetwear-hoodie.jpg";
    const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA";

    expect(getImageUrl(external)).toBe(external);
    expect(getImageUrl(dataUri)).toBe(dataUri);
  });

  it("3. Menggabungkan relative path dengan BACKEND_BASE URL secara aman", () => {
    const relativeWithSlash = "/uploads/hoodie.png";
    const relativeWithoutSlash = "uploads/jacket.png";

    expect(getImageUrl(relativeWithSlash)).toContain("/uploads/hoodie.png");
    expect(getImageUrl(relativeWithoutSlash)).toContain("/uploads/jacket.png");
  });

  it("4. Mampu mengekstrak image dari objek produk ({ img_url } atau { image_url })", () => {
    const productA = { img_url: "/uploads/pants.png" };
    const productB = { image_url: "https://cdn.example.com/cap.png" };
    const emptyProduct = {};

    expect(getImageUrl(productA)).toContain("/uploads/pants.png");
    expect(getImageUrl(productB)).toBe("https://cdn.example.com/cap.png");
    expect(getImageUrl(emptyProduct)).toBe(fallbackUrl);
  });
});
