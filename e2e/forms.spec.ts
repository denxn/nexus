import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

// React resets a form after a failed submit. Controlled radios and selects must still post what the screen shows.
test("a failed submit does not change what the next submit posts", async ({ page }) => {
  const label = `e2e-forms-${Date.now()}`;
  page.on("dialog", (d) => d.accept());

  await page.goto("/login");
  await page.getByPlaceholder("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Quick-log: choose Sleep, fail validation, correct the amount. It must be saved as sleep (hours), not study.
  await page.getByRole("button", { name: /Log an entry/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByText("Sleep", { exact: true }).click();
  await sheet.getByLabel(/Amount/).fill("-5");
  await sheet.getByLabel(/Note/).fill(label);
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect(sheet.getByRole("alert")).toContainText("Enter a value between");
  await sheet.getByLabel(/Amount/).fill("7");
  await sheet.getByRole("button", { name: "Save" }).click();
  const row = page.getByRole("listitem").filter({ hasText: label });
  await expect(row).toContainText("7 h");
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);

  // Repeating to-do: choose Daily, fail (no due date), add the date. It must still repeat.
  const title = `e2e-repeat-${Date.now()}`;
  await page.goto("/plan?tab=todo");
  await page.getByRole("button", { name: "+ Add to-do" }).click();
  const todoSheet = page.getByRole("dialog");
  await todoSheet.getByLabel("What needs doing?").fill(title);
  await todoSheet.getByLabel("Repeats").selectOption("DAILY");
  await todoSheet.getByRole("button", { name: "Save" }).click();
  await expect(todoSheet.getByRole("alert")).toContainText("Set a due date to repeat");
  await todoSheet.getByLabel(/Due/).fill("2099-01-01");
  await todoSheet.getByRole("button", { name: "Save" }).click();
  const todoRow = page.getByRole("listitem").filter({ hasText: title });
  await expect(todoRow).toContainText("Daily");
  await todoRow.getByRole("button", { name: "Delete" }).click();
  await expect(todoRow).toHaveCount(0);
});
