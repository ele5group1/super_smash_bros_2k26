import { test, expect } from "@playwright/test";

test("strategy applies to a recorded round and shared analytics renders", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/scenarios/haunted_pipes");
  await page.getByLabel("Potion budget").selectOption("5");
  await page.getByRole("button", { name: "Compare strategies", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Strategy Lab" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply recommendation" })).toBeVisible();
  await page.getByLabel("Decision objective").selectOption("balanced");
  await page.getByLabel("Minimum coin reserve").fill("10");
  await expect(page.getByRole("button", { name: "Apply recommendation" })).toBeVisible();
  const potionRow = page.getByRole("row").filter({ hasText: "20 HP emergency potion" });
  await page.getByRole("heading", { name: "Recommended plan" }).locator("..").screenshot({ path: test.info().outputPath("decision-model.png") });
  await potionRow.getByRole("button", { name: "Use plan" }).click();
  await expect(page.getByLabel("Potion budget")).toHaveValue("5");
  await page.locator("#launch-battle-btn").click();
  await expect(page.getByRole("heading", { name: "Prediction versus outcome" })).toBeVisible();
  await expect(page.getByText(/Potion budget: 5 coins/)).toBeVisible();
  const battleId = page.url().split("/").pop();
  const record = await (await page.request.get(`/api/battles/${battleId}`)).json();
  expect(record.battle.metadata.early_heal_spend).toBe(5);
  expect(record.battle.metadata.planning_objective).toBe("balanced");
  expect(record.battle.metadata.minimum_initial_reserve).toBe(10);
  expect(record.battle.metadata.learned_prediction.available).toBe(true);
  expect(record.battle.metadata.terminal_id).toMatch(/^terminal-/);
  await page.locator("#open-report-btn").click();
  await expect(page).toHaveURL(/\/report\//);
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Shared arcade control center" })).toBeVisible();
  await expect(page.getByText(/Brier score:/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Open round" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trained prediction model" })).toBeVisible();
  await expect(page.getByText("Logistic regression", { exact: true }).first()).toBeVisible();
  await page.getByRole("heading", { name: "Trained prediction model" }).locator("..").screenshot({ path: test.info().outputPath("trained-model.png") });
  await page.getByLabel("Diagnostic comparison").selectOption("team_size");
  await expect(page.getByRole("heading", { name: /Expected counts/ })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("shared-analytics.png"), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test("two overlapping terminal requests feed the same dataset", async ({ request }) => {
  const outcomes = await Promise.all(["terminal-A", "terminal-B"].map((terminal, i) => request.post("/api/battles", {
    data: { scenario_id: "haunted_pipes", player_team: ["ember_fox", "bubble_toad", "moss_shroom"], seed: 700001+i, early_heal_spend: 5, terminal_id: terminal },
  })));
  for (const result of outcomes) expect(result.ok()).toBeTruthy();
  const ids = await Promise.all(outcomes.map(async response => (await response.json()).battle_id));
  expect(ids[0]).not.toBe(ids[1]);
  const report = await (await request.get("/api/analytics/evaluation")).json();
  expect(report.recent_sessions.map((r: any) => r.battle_id)).toEqual(expect.arrayContaining(ids));
});
