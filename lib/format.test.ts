import { describe, expect, test } from "vitest";
import { formatDuration, formatHours, formatKcal } from "./format";

describe("format", () => {
  test("formatDuration shows hours and minutes", () => {
    expect(formatDuration(150)).toBe("2 h 30 m");
  });

  test("formatDuration drops hours under an hour", () => {
    expect(formatDuration(45)).toBe("45 m");
  });

  test("formatDuration of zero", () => {
    expect(formatDuration(0)).toBe("0 m");
  });

  test("formatHours renders one decimal", () => {
    expect(formatHours(150)).toBe("2.5");
    expect(formatHours(0)).toBe("0.0");
  });

  test("formatKcal groups thousands", () => {
    expect(formatKcal(2420)).toBe("2,420");
  });
});
