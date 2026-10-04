import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

test("log in, log a study entry, see it on the dashboard, delete it", async ({ page }) => {
  const label = `e2e-${Date.now()}`;

  // Unauthenticated visits are sent to the login page.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByPlaceholder("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/$/);

  const studyCard = page.locator("section", {
    has: page.getByRole("heading", { name: "Study", exact: true }),
  });
  const studyHours = async () =>
    parseFloat((await studyCard.locator("p").first().innerText()).trim());
  const before = await studyHours();

  // Log 90 minutes of study.
  await page.getByRole("button", { name: /Log an entry/ }).click();
  await page.getByLabel(/Amount/).fill("90");
  await page.getByLabel(/Note/).fill(label);
  await page.getByRole("button", { name: "Save" }).click();

  const row = page.getByRole("listitem").filter({ hasText: label });
  await expect(row).toBeVisible();
  await expect(row).toContainText("1 h 30 m");
  await expect.poll(studyHours).toBeCloseTo(before + 1.5, 1);

  // Delete it again so the run leaves no data behind.
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);
  await expect.poll(studyHours).toBeCloseTo(before, 1);
});
