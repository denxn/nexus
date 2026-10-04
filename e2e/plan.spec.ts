import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

const todayRome = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

test("plan a goal, a to-do and an event, see them on the dashboard, then clean up", async ({ page }) => {
  const stamp = Date.now();
  const goal = `e2e goal ${stamp}`;
  const todo = `e2e todo ${stamp}`;
  const event = `e2e event ${stamp}`;
  const today = todayRome();
  page.on("dialog", (d) => d.accept());

  await page.goto("/login");
  await page.getByPlaceholder("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Goal (deadline today so it ranks first on the dashboard card).
  await page.goto("/plan?tab=goals");
  await page.getByRole("button", { name: "+ Add goal" }).click();
  const goalSheet = page.getByRole("dialog");
  await goalSheet.getByLabel("Title").fill(goal);
  await goalSheet.getByLabel(/Deadline/).fill(today);
  await goalSheet.getByLabel(/Progress/).fill("33");
  await goalSheet.getByRole("button", { name: "Save" }).click();
  const goalRow = page.getByRole("listitem").filter({ hasText: goal });
  await expect(goalRow).toContainText("33%");

  // To-do due today.
  await page.goto("/plan?tab=todo");
  await page.getByRole("button", { name: "+ Add to-do" }).click();
  const todoSheet = page.getByRole("dialog");
  await todoSheet.getByLabel("What needs doing?").fill(todo);
  await todoSheet.getByLabel(/Due/).fill(today);
  await todoSheet.getByRole("button", { name: "Save" }).click();
  const todoRow = page.getByRole("listitem").filter({ hasText: todo });
  await expect(todoRow).toContainText("due today");

  // Event today at 09:00.
  await page.goto("/calendar");
  await page.getByRole("button", { name: "+ Add" }).click();
  const eventSheet = page.getByRole("dialog");
  await eventSheet.getByLabel("Title").fill(event);
  await eventSheet.getByRole("button", { name: "Save" }).click();
  const agendaEvent = page.getByRole("listitem").filter({ hasText: event });
  await expect(agendaEvent).toContainText("09:00");
  await expect(page.getByRole("listitem").filter({ hasText: todo })).toBeVisible();

  // Dashboard previews.
  await page.goto("/");
  await expect(page.getByText(goal)).toBeVisible();
  await expect(page.getByText(event)).toBeVisible();
  await expect(page.getByText(todo)).toBeVisible();

  // Clean up so the run leaves no data behind.
  await page.goto("/calendar");
  await page.getByRole("listitem").filter({ hasText: event }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: event })).toHaveCount(0);
  await page.goto("/plan?tab=todo");
  await page.getByRole("listitem").filter({ hasText: todo }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: todo })).toHaveCount(0);
  await page.goto("/plan?tab=goals");
  await page.getByRole("listitem").filter({ hasText: goal }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: goal })).toHaveCount(0);
});
