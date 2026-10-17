import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Puffcap Arena End-to-End Smoke Test", () => {
  test("smoke flow: pick scenario, run battle, open report, upload sample file", async ({ page }) => {
    // 1. Open app
    await page.goto("/");
    await expect(page.locator("h2")).toContainText("Super Mario x Pokémon Battle Arena");

    // 2. Scenario selection
    const scenarioCard = page.locator(".arcade-panel").filter({ hasText: "Pipe Ambush" }).first();
    await scenarioCard.click();

    // 3. Launch Battle
    const startBtn = page.getByRole("button", { name: /ENTER BATTLE/i });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // 4. Battle Screen
    await expect(page).toHaveURL(/.*\/battle\/.*/);
    await expect(page.getByRole("button", { name: /Play|Pause/i })).toBeVisible();

    // 5. Open Analytics Report
    const reportBtn = page.getByRole("button", { name: /Open Analytics Report/i });
    await reportBtn.click();
    await expect(page).toHaveURL(/.*\/report\/.*/);
    await expect(page.locator("h2")).toContainText(/VICTORY|DEFEAT/);

    // 6. Navigate to Data screen
    // Check if mobile menu toggle is visible, if so open it, or navigate directly to /data
    const mobileToggle = page.locator(".mobile-nav-toggle");
    if (await mobileToggle.isVisible()) {
      await mobileToggle.click();
    }
    await page.getByRole("link", { name: /Data & Uploads/i }).click();
    await expect(page).toHaveURL(/.*\/data/);

    // Upload sample file using process.cwd()
    const samplePath = path.resolve(process.cwd(), "../backend/samples/creatures.csv");
    const fileInput = page.locator("input[type=file]");
    await fileInput.setInputFiles(samplePath);

    // Verify upload report shows up
    await expect(page.locator(".arcade-panel").filter({ hasText: "Validation Report" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/VALIDATED & STORED/i)).toBeVisible();

    // Confirm it appears in the Uploaded File Registry table
    await expect(page.locator("table.arcade-table").filter({ hasText: "creatures.csv" })).toBeVisible();
  });

  test("mobile 390px viewport renders without horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Verify no horizontal overflow on body at 390px
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allow sub-pixel rounding
  });
});
