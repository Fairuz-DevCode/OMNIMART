import { defineConfig, devices } from "@playwright/test";

/**
 * Konfigurasi Playwright E2E Testing Root Monorepo
 * Menguji integrasi penuh antara Browser, Frontend Vite, dan Backend Express.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  workers: 2,
  reporter: [["list"]],
  use: {
    baseURL: process.env.FRONTEND_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Desktop Chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
