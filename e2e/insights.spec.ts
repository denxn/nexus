import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

test("the dashboard shows the brief, score and charts, and /analytics shows its three sections", async ({ page }) => {
  const label = `e2e-insights-${Date.now()}`;
  page.on("dialog", (d) => d.accept());

  await page.goto("/login");
  await page.getByPlaceholder("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Insight cards on the dashboard.
  await expect(page.getByRole("heading", { name: "Daily brief" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Discipline score" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Performance overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activity correlation" })).toBeVisible();
  await expect(page.getByText(/Not enough data yet|No clear link|goes with (higher|lower)/).first()).toBeVisible();

  // Logging something keeps every card rendering (no crash, no NaN).
  await page.getByRole("button", { name: /Log an entry/ }).click();
  await page.getByLabel(/Amount/).fill("45");
  await page.getByLabel(/Note/).fill(label);
  await page.getByRole("button", { name: "Save" }).click();
  const row = page.getByRole("listitem").filter({ hasText: label });
  await expect(row).toBeVisible();
  await expect(page.getByRole("heading", { name: "Discipline score" })).toBeVisible();
  expect(await page.locator("main").innerText()).not.toMatch(/NaN|Infinity/);

  // The correlation picker updates the URL.
  await page.getByLabel("with").selectOption("mood");
  await expect(page).toHaveURL(/cy=mood/);

  // Analytics page.
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Performance overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activity correlation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Flaws analytics" })).toBeVisible();
  expect(await page.locator("main").innerText()).not.toMatch(/NaN|Infinity/);

  // Clean up.
  await page.goto("/");
  await page.getByRole("listitem").filter({ hasText: label }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: label })).toHaveCount(0);
});
