import { describe, expect, test } from "vitest";
import { config } from "@/proxy";

// The matcher is "/((?!a|b).*)": a path is guarded unless it starts with an excluded prefix.
const guarded = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe("proxy matcher", () => {
  test("guards the app pages", () => {
    for (const path of ["/", "/plan", "/calendar", "/analytics", "/login", "/anything/else"]) {
      expect(guarded(path)).toBe(true);
    }
  });

  test("leaves static assets, the favicon and robots.txt public", () => {
    for (const path of ["/_next/static/chunks/a.js", "/_next/image", "/favicon.ico", "/robots.txt"]) {
      expect(guarded(path)).toBe(false);
    }
  });
});
