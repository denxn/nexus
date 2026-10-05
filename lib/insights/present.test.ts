import { describe, expect, test } from "vitest";
import { formatChange, withParams } from "./present";

describe("formatChange", () => {
  test("positive, negative and zero changes", () => {
    expect(formatChange(12, 100)).toEqual({ text: "+12%", tone: "up" });
    expect(formatChange(-5, 100)).toEqual({ text: "-5%", tone: "down" });
    expect(formatChange(0, 100)).toEqual({ text: "0%", tone: "flat" });
  });

  test("no previous data: 'new' when there is something now, a dash when not", () => {
    expect(formatChange(null, 40)).toEqual({ text: "new", tone: "new" });
    expect(formatChange(null, 0)).toEqual({ text: "–", tone: "none" });
  });
});

describe("withParams", () => {
  test("merges current params with overrides and drops empty ones", () => {
    expect(withParams("/", { range: "30", perf: undefined }, { perf: "month" })).toBe("/?range=30&perf=month");
  });

  test("overrides replace existing values", () => {
    expect(withParams("/analytics", { perf: "week", cx: "sleep" }, { perf: "year" })).toBe("/analytics?perf=year&cx=sleep");
  });

  test("array params use their first value", () => {
    expect(withParams("/", { cx: ["mood", "sleep"] }, {})).toBe("/?cx=mood");
  });

  test("no params gives just the base path", () => {
    expect(withParams("/", {}, {})).toBe("/");
    expect(withParams("/", { a: undefined, b: "" }, {})).toBe("/");
  });

  test("values are URL-encoded", () => {
    expect(withParams("/", {}, { q: "a b&c" })).toBe("/?q=a+b%26c");
  });
});
