import { describe, expect, test } from "vitest";
import { parseNotesParams } from "./params";

describe("parseNotesParams", () => {
  test("defaults", () => {
    expect(parseNotesParams({})).toEqual({ q: null, day: null, page: 1 });
  });

  test("q is trimmed; blank becomes null; long values are cut to 100", () => {
    expect(parseNotesParams({ q: "  maths  " }).q).toBe("maths");
    expect(parseNotesParams({ q: "   " }).q).toBeNull();
    expect(parseNotesParams({ q: "x".repeat(300) }).q).toHaveLength(100);
  });

  test("q keeps special characters as they are", () => {
    expect(parseNotesParams({ q: "100% & _x_ \"quoted\"" }).q).toBe("100% & _x_ \"quoted\"");
  });

  test("day must be a real day key", () => {
    expect(parseNotesParams({ day: "2026-10-05" }).day).toBe("2026-10-05");
    for (const bad of ["2026-02-30", "x", "", "9999-12-31", undefined]) expect(parseNotesParams({ day: bad }).day).toBeNull();
  });

  test("page: positive integers kept, everything else is 1", () => {
    expect(parseNotesParams({ page: "4" }).page).toBe(4);
    for (const bad of ["0", "-1", "2.5", "x", "", undefined]) expect(parseNotesParams({ page: bad }).page).toBe(1);
  });

  test("arrays use the first value", () => {
    expect(parseNotesParams({ q: ["a", "b"], day: ["2026-10-05", "x"], page: ["2", "3"] })).toEqual({ q: "a", day: "2026-10-05", page: 2 });
  });
});
