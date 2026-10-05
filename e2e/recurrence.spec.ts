import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

const rome = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

test("recurring to-do rolls forward from the Today card; recurring event can be skipped and deleted", async ({ page }) => {
  const stamp = Date.now();
  const todo = `e2e-daily-${stamp}`;
  const event = `e2e-weekly-${stamp}`;
  const today = rome();
  const nextWeek = rome(7);
  page.on("dialog", (d) => d.accept());

  await page.goto("/login");
  await page.getByPlaceholder("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/$/);

  // A daily to-do due today.
  await page.goto("/plan?tab=todo");
  await page.getByRole("button", { name: "+ Add to-do" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("What needs doing?").fill(todo);
  await sheet.getByLabel(/Due/).fill(today);
  await sheet.getByLabel("Repeats").selectOption("DAILY");
  await sheet.getByRole("button", { name: "Save" }).click();
  const openRow = page.getByRole("listitem").filter({ hasText: todo }).filter({ hasText: "Daily" });
  await expect(openRow).toContainText("due today");

  // It shows in the Today card; ticking it there rolls the original to tomorrow and keeps a completed copy.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Today", level: 2 })).toBeVisible();
  await page.getByLabel(`Complete ${todo}`).click();
  // The completed copy for today shows up as a done item.
  await expect(page.getByLabel(`Reopen ${todo}`)).toBeVisible();
  await page.goto("/plan?tab=todo");
  await expect(page.getByRole("listitem").filter({ hasText: todo }).filter({ hasText: "Daily" })).toContainText("due tomorrow");
  await page.getByText(/^Completed \(/).click();
  const copy = page.locator("details").getByRole("listitem").filter({ hasText: todo });
  await expect(copy).toHaveCount(1);
  await expect(copy).toContainText("due today");

  // Clean up both rows.
  await copy.getByRole("button", { name: "Delete" }).click();
  await expect(copy).toHaveCount(0);
  const original = page.getByRole("listitem").filter({ hasText: todo });
  await original.getByRole("button", { name: "Delete" }).click();
  await expect(original).toHaveCount(0);

  // A weekly event starting today: skip today, keep next week, then delete the series.
  await page.goto(`/calendar?day=${today}`);
  await page.getByRole("button", { name: "+ Add" }).click();
  const eventSheet = page.getByRole("dialog");
  await eventSheet.getByLabel("Title").fill(event);
  await eventSheet.getByLabel("Repeats").selectOption("WEEKLY");
  await eventSheet.getByRole("button", { name: "Save" }).click();
  const agendaItem = page.locator("li").filter({ hasText: event });
  await expect(agendaItem).toContainText("Weekly");

  await agendaItem.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Skip this day" }).click();
  await expect(agendaItem).toHaveCount(0);

  await page.goto(`/calendar?day=${nextWeek}`);
  await expect(agendaItem).toContainText("Weekly");
  await agendaItem.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete the series" }).click();
  await expect(agendaItem).toHaveCount(0);
});
