import { describe, expect, test } from "vitest";
import { DEFAULT_RANGE, parseRange } from "./range";

describe("parseRange", () => {
  test("accepts 7, 30 and 90", () => {
    expect(parseRange("7")).toBe(7);
    expect(parseRange("30")).toBe(30);
    expect(parseRange("90")).toBe(90);
  });

  test("defaults to 30 when missing", () => {
    expect(parseRange(undefined)).toBe(DEFAULT_RANGE);
    expect(DEFAULT_RANGE).toBe(30);
  });

  test("falls back to the default for unsupported or junk values", () => {
    expect(parseRange("14")).toBe(30);
    expect(parseRange("abc")).toBe(30);
    expect(parseRange("-7")).toBe(30);
    expect(parseRange("")).toBe(30);
  });

  test("uses the first value when the param is repeated", () => {
    expect(parseRange(["90", "7"])).toBe(90);
  });
});
