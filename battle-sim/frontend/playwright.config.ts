import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  expect: {
    timeout: 8000,
  },
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:8000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "python -m uvicorn app.main:app --port 8000",
    cwd: "../backend",
    url: "http://127.0.0.1:8000/api/health",
    reuseExistingServer: true,
    timeout: 15000,
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
    {
      name: "Mobile Safari / 390px",
      use: { viewport: { width: 390, height: 844 }, isMobile: true },
    },
  ],
});
