import { test, expect } from "@playwright/test";

test.describe("E2E Test: Customer Authentication Flow in Browser", () => {
  test("1. Membuka halaman login dan memvalidasi elemen form", async ({ page }) => {
    await page.goto("/login");

    // Input email & password harus ada
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole("button", { name: /Masuk|Login/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test("2. Navigasi dari halaman login ke registrasi berhasil", async ({ page }) => {
    await page.goto("/login");

    // Klik link menuju halaman registrasi
    const registerLink = page.getByRole("link", { name: /Daftar|Register/i }).first();
    await expect(registerLink).toBeVisible();
    await registerLink.click();

    // Verifikasi URL berubah ke /register
    await expect(page).toHaveURL(/.*register/);
  });
});
