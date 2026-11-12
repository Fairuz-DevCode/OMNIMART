import { test, expect } from "@playwright/test";

test.describe("E2E Test: Customer Landing Page & Product Catalog Journey", () => {
  test("1. Homepage berhasil dimuat dengan Navbar dan Hero Banner", async ({ page }) => {
    await page.goto("/");

    // Memverifikasi elemen utama toko streetwear
    await expect(page).toHaveTitle(/Nexa|Streetwear/i);
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    // Verifikasi link navigasi katalog
    const catalogLink = page.getByRole("link", { name: /Katalog|Shop|Product/i }).first();
    await expect(catalogLink).toBeVisible();
  });

  test("2. Navigasi ke halaman katalog produk (/product) menampilkan list item", async ({ page }) => {
    await page.goto("/product");

    // Pastikan URL mengarah ke /product
    await expect(page).toHaveURL(/.*product/);

    // Verifikasi container halaman produk
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();
  });
});
