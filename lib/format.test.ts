import { describe, expect, test } from "vitest";
import {
  formatDuration,
  formatEntryValue,
  formatHours,
  formatKcal,
} from "./format";

describe("formatEntryValue", () => {
  test("workout and study render as durations", () => {
    expect(formatEntryValue("WORKOUT", 75)).toBe("1 h 15 m");
    expect(formatEntryValue("STUDY", 45)).toBe("45 m");
  });

  test("sleep renders hours", () => {
    expect(formatEntryValue("SLEEP", 7)).toBe("7 h");
    expect(formatEntryValue("SLEEP", 7.5)).toBe("7.5 h");
  });

  test("meal renders grouped kcal", () => {
    expect(formatEntryValue("MEAL", 1250)).toBe("1,250 kcal");
  });

  test("mood renders out of 10", () => {
    expect(formatEntryValue("MOOD", 8)).toBe("8/10");
  });
});

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
