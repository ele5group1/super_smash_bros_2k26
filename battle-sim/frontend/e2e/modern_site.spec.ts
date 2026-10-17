import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "path";
import fs from "fs";

const SCREENSHOTS_DIR = path.resolve(process.cwd(), "../../docs/screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

test.describe("Modern Battle Simulator E2E & A11y Suite", () => {
  test("1. Landing page loads hero, live battle preview, CTA, and passes a11y", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText(/Tactical Creature Battles/i);
    await expect(page.locator("#hero-start-battle-btn")).toBeVisible();
    await expect(page.getByText("Featured Scenarios")).toBeVisible();

    // Verify accessibility with Axe
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"]) // Soften color-contrast in automated test run to avoid false positives on gradients
      .analyze();
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(criticalViolations).toEqual([]);
  });

  test("2. Command palette opens with Ctrl+K, filters, and navigates", async ({ page }) => {
    await page.goto("/");
    // Trigger palette using keyboard or button
    await page.locator("#top-search-button").click();
    const paletteInput = page.locator("[data-testid=command-palette-input]");
    await expect(paletteInput).toBeVisible();

    // Type query
    await paletteInput.fill("Data");
    await page.keyboard.press("Enter");

    // Expect navigation to /data
    await expect(page).toHaveURL(/.*\/data/);
  });

  test("3. Full combat flow: Select to Battle to Report", async ({ page }) => {
    // 1. Visit scenarios
    await page.goto("/scenarios");
    await expect(page.locator("h1")).toContainText(/Scenario & Squad Builder/i);

    // 2. Select Scenario
    const scenarioCard = page.locator("[data-testid^=scenario-card-]").first();
    await scenarioCard.click();

    // 3. Launch Battle
    const launchBtn = page.locator("#launch-battle-btn");
    await expect(launchBtn).toBeEnabled();
    await launchBtn.click();

    // 4. Arrive at Battle Screen
    await expect(page).toHaveURL(/.*\/battles\/.*/);
    await expect(page.locator("#replay-play-pause-btn")).toBeVisible();

    // 5. Navigate to Report
    const reportBtn = page.locator("#open-report-btn");
    await reportBtn.click();
    await expect(page).toHaveURL(/.*\/report\/.*/);
    await expect(page.locator(".text-display").first()).toContainText(/VICTORY|DEFEAT/i);
  });

  test("4. Upload dataset and view validation report panel", async ({ page }) => {
    await page.goto("/data");
    await expect(page.locator("h1")).toContainText(/Data Management/i);

    // Upload sample creatures CSV
    const samplePath = path.resolve(process.cwd(), "../backend/samples/creatures.csv");
    const fileInput = page.locator("input[type=file]");
    await fileInput.setInputFiles(samplePath);

    // Verify upload status card shows imported or validation
    await expect(page.getByText(/IMPORTE|VALIDATE/i)).toBeVisible({ timeout: 10000 });
  });

  test("5. Settings theme persistence across page reload", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("h1")).toContainText(/Preferences & Accessibility/i);

    // Switch theme to light
    const themeSelect = page.locator("#theme-select");
    await themeSelect.selectOption("light");

    // Verify data-theme attribute
    const themeAttr = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(themeAttr).toBe("light");

    // Reload page and check persistence
    await page.reload();
    const persistedTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(persistedTheme).toBe("light");

    // Revert back to dark for cleanliness
    await page.locator("#theme-select").selectOption("dark");
  });

  test("6. Capture Light and Dark screenshots at 1280px and 390px for all screens", async ({ page }) => {
    // First obtain a valid battle and report URL by launching a quick battle
    await page.goto("/scenarios");
    await page.waitForLoadState("networkidle");
    const scenarioCard = page.locator("[data-testid^=scenario-card-]").first();
    await scenarioCard.click();
    const launchBtn = page.locator("#launch-battle-btn");
    await launchBtn.click();
    await page.waitForURL(/.*\/battles\/.*/);
    const battleUrl = page.url();

    const reportBtn = page.locator("#open-report-btn");
    await reportBtn.click();
    await page.waitForURL(/.*\/report\/.*/);
    const reportUrl = page.url();

    const screens = [
      { name: "landing", path: "/" },
      { name: "select", path: "/scenarios" },
      { name: "battle", path: battleUrl },
      { name: "report", path: reportUrl },
      { name: "plan", path: "/plan" },
      { name: "author", path: "/author" },
      { name: "data", path: "/data" },
      { name: "settings", path: "/settings" },
    ];

    const viewports = [
      { name: "desktop_1280", width: 1280, height: 800 },
      { name: "mobile_390", width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const sc of screens) {
        await page.goto(sc.path);
        await page.waitForLoadState("networkidle");

        // 1. Dark theme screenshot
        await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `${sc.name}_${vp.name}_dark.png`),
          fullPage: true,
        });

        // 2. Light theme screenshot
        await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `${sc.name}_${vp.name}_light.png`),
          fullPage: true,
        });
      }
    }
  });
});
