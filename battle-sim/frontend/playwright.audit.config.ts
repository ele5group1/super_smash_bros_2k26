import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Dedicated port and database: browser checks must never pollute booth records.
const isolated = mkdtempSync(path.join(tmpdir(), "battle-audit-"));
export default defineConfig({
  testDir: "./e2e", testMatch: "audit_flow.spec.ts", timeout: 60000,
  expect: { timeout: 15000 }, workers: 1, reporter: "list",
  use: { baseURL: "http://127.0.0.1:8011", trace: "retain-on-failure" },
  webServer: {
    command: "python -m uvicorn app.main:app --host 127.0.0.1 --port 8011",
    cwd: "../backend", url: "http://127.0.0.1:8011/api/health", reuseExistingServer: false,
    env: { BATTLE_SIM_DB: path.join(isolated, "browser.sqlite") }, timeout: 30000,
  },
  projects: [{ name: "Desktop", use: { viewport: { width: 1280, height: 900 } } },
             { name: "Mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true } }],
});
