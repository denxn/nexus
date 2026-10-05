import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

test("notes: add, search, edit, see on the calendar, delete", async ({ page }) => {
  const title = `e2e-note-${Date.now()}`;
  page.on("dialog", (d) => d.accept());
  const card = page.locator("article").filter({ hasText: title });

  await page.goto("/login");
  await page.getByPlaceholder("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Add a two-line note.
  await page.goto("/notes");
  await page.getByRole("button", { name: "+ Add note" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Title (optional)").fill(title);
  await sheet.getByLabel("Note", { exact: true }).fill("First line of the e2e note\nSecond line");
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect(card).toBeVisible();
  await expect(card).toContainText("Second line");

  // Find it by search; the URL carries the query.
  await page.getByRole("searchbox", { name: "Search notes" }).fill(title);
  await page.getByRole("searchbox", { name: "Search notes" }).press("Enter");
  await expect(page).toHaveURL(new RegExp(`q=${title}`));
  await expect(card).toBeVisible();

  // Edit the body.
  await card.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Note", { exact: true }).fill("Edited body text");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(card).toContainText("Edited body text");

  // The calendar's day agenda shows it and links back to the day's notes.
  await page.goto("/calendar");
  await expect(page.getByText(title)).toBeVisible();
  await page.getByRole("link", { name: "Open in Notes" }).click();
  await expect(page).toHaveURL(/\/notes\?day=\d{4}-\d{2}-\d{2}/);
  await expect(card).toBeVisible();

  // Delete it.
  await card.getByRole("button", { name: "Delete" }).click();
  await expect(card).toHaveCount(0);
});
