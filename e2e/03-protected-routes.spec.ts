import { test, expect } from "@playwright/test";

test.describe("E2E Test: Guest Security & Protected Routes Barrier", () => {
  test("1. Percobaan akses langsung ke /cart oleh guest dialihkan ke /login", async ({ page }) => {
    await page.goto("/cart");
    // ProtectedRoute mengalihkan user yang belum login ke /login
    await expect(page).toHaveURL(/.*login/);
  });

  test("2. Percobaan akses langsung ke /checkout oleh guest dialihkan ke /login", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/.*login/);
  });

  test("3. Percobaan akses langsung ke /profile dialihkan ke /login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/.*login/);
  });
});
