import { describe, expect, test } from "vitest";
import { parseHistoryParams } from "./params";

const parse = (p: Parameters<typeof parseHistoryParams>[0] = {}) => parseHistoryParams(p);

describe("range", () => {
  test("accepts 7, 30, 90, 365 and all", () => {
    expect(parse({ range: "7" }).range).toBe(7);
    expect(parse({ range: "30" }).range).toBe(30);
    expect(parse({ range: "90" }).range).toBe(90);
    expect(parse({ range: "365" }).range).toBe(365);
    expect(parse({ range: "all" }).range).toBe("all");
  });

  test("junk, empty and missing fall back to 30; arrays use the first value", () => {
    for (const bad of ["14", "x", "", "-7", "7.5", undefined]) expect(parse({ range: bad }).range).toBe(30);
    expect(parse({ range: ["90", "7"] }).range).toBe(90);
    expect(parse({ range: ["zz"] }).range).toBe(30);
  });
});

describe("label", () => {
  test("is trimmed; blank means no filter", () => {
    expect(parse({ label: "  Maths  " }).label).toBe("Maths");
    expect(parse({ label: "   " }).label).toBeNull();
    expect(parse({ label: "" }).label).toBeNull();
    expect(parse({}).label).toBeNull();
  });

  test("is cut to 80 characters", () => {
    expect(parse({ label: "x".repeat(200) }).label).toHaveLength(80);
  });

  test("an array uses its first value", () => {
    expect(parse({ label: ["a", "b"] }).label).toBe("a");
  });
});

describe("page", () => {
  test("a positive integer is kept", () => {
    expect(parse({ page: "3" }).page).toBe(3);
  });

  test("zero, negative, fractional, junk and missing become 1", () => {
    for (const bad of ["0", "-2", "2.5", "x", "", undefined]) expect(parse({ page: bad }).page).toBe(1);
  });
});

test("defaults", () => {
  expect(parse()).toEqual({ range: 30, label: null, page: 1 });
});
