import { describe, expect, test } from "vitest";
import { parseFlag, parseId } from "./action-helpers";

describe("parseId", () => {
  test("accepts a non-empty string", () => {
    expect(parseId("cmabc123")).toBe("cmabc123");
  });

  test("rejects undefined, null, empty, non-strings and objects (which Prisma would treat as no filter)", () => {
    for (const bad of [undefined, null, "", 42, { not: "" }, ["a"]]) {
      expect(() => parseId(bad)).toThrow();
    }
  });
});

describe("parseFlag", () => {
  test("accepts booleans only", () => {
    expect(parseFlag(true)).toBe(true);
    expect(parseFlag(false)).toBe(false);
    for (const bad of ["false", 0, 1, undefined, null]) {
      expect(() => parseFlag(bad)).toThrow();
    }
  });
});
