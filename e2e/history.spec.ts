import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

test("the Study page: log with a label, filter by it, edit, delete; Workouts and Sleep render", async ({ page }) => {
  const label = `e2e-hist-${Date.now()}`;
  page.on("dialog", (d) => d.accept());

  await page.goto("/login");
  await page.getByPlaceholder("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Log study from the page: the type is preselected.
  await page.goto("/study");
  await expect(page.getByRole("heading", { name: "Study", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Log study" }).click();
  await expect(page.getByRole("dialog").getByRole("radio", { name: "Study" })).toBeChecked();
  await page.getByLabel(/Amount/).fill("45");
  await page.getByLabel(/Note/).fill(label);
  await page.getByRole("button", { name: "Save" }).click();

  const row = page.locator('[class*="row"]').filter({ hasText: label });
  await expect(row).toBeVisible();
  await expect(row).toContainText("45 m");

  // The label chip filters the page (URL, tiles and list together).
  await page.getByRole("link", { name: new RegExp(label) }).click();
  await expect(page).toHaveURL(new RegExp(`label=${label}`));
  await expect(row).toBeVisible();
  await expect(page.getByText("Total time").locator("xpath=following-sibling::strong")).toHaveText("45 m");

  // Edit it to 60 minutes.
  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel(/Amount/).fill("60");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(row).toContainText("1 h 0 m");

  // Delete it.
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);

  // The other two pages render their headings and summary tiles without NaN.
  for (const [path, heading, tile] of [["/workouts", "Workouts", "Sessions"], ["/sleep", "Sleep", "Average"]] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.getByText(tile, { exact: true })).toBeVisible();
    expect(await page.locator("main").innerText()).not.toMatch(/NaN|Infinity/);
  }
});
