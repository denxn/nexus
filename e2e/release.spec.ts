import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

test("security headers, robots.txt and the not-found page", async ({ page, request }) => {
  // Public: headers on the login page and a robots.txt that disallows everything.
  const login = await request.get("/login");
  expect(login.headers()["x-content-type-options"]).toBe("nosniff");
  expect(login.headers()["x-frame-options"]).toBe("DENY");
  expect(login.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(login.headers()["permissions-policy"]).toContain("camera=()");

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Disallow: /");

  // Pages tell crawlers to stay away.
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // Logged in, an unknown address shows the friendly not-found page with a way back.
  await page.getByPlaceholder("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/definitely-not-a-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Back to the dashboard" }).click();
  await expect(page).toHaveURL(/\/$/);
});
