import { describe, expect, test } from "vitest";
import { noteSchema } from "./schema";

const fieldErrors = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => String(i.path[0]));
const parse = (over: Record<string, unknown> = {}) =>
  noteSchema.safeParse({ day: "2026-10-05", title: "", body: "Hello", ...over });

describe("noteSchema", () => {
  test("a valid note passes; a blank title becomes undefined", () => {
    const r = parse({ title: "" });
    expect(r.success && r.data).toEqual({ day: "2026-10-05", title: undefined, body: "Hello" });
  });

  test("a title is kept and trimmed", () => {
    const r = parse({ title: "  Morning  " });
    expect(r.success && r.data.title).toBe("Morning");
  });

  test("an impossible or malformed date is rejected on day", () => {
    for (const day of ["2026-02-30", "2026-13-01", "x", "", "2026-2-3"]) expect(fieldErrors(parse({ day }))).toContain("day");
  });

  test("a year outside 1970 to 2100 is rejected", () => {
    expect(fieldErrors(parse({ day: "9999-12-31" }))).toContain("day");
    expect(fieldErrors(parse({ day: "1969-12-31" }))).toContain("day");
    expect(parse({ day: "2100-12-31" }).success).toBe(true);
  });

  test("an empty, missing or whitespace-only body is rejected on body", () => {
    expect(fieldErrors(parse({ body: "" }))).toContain("body");
    expect(fieldErrors(parse({ body: "   \n  " }))).toContain("body");
    expect(fieldErrors(noteSchema.safeParse({ day: "2026-10-05" }))).toContain("body");
  });

  test("the body is limited to 5000 characters after trimming", () => {
    expect(parse({ body: "x".repeat(5000) }).success).toBe(true);
    expect(parse({ body: "  " + "x".repeat(5000) + "  " }).success).toBe(true);
    expect(fieldErrors(parse({ body: "x".repeat(5001) }))).toContain("body");
  });

  test("the title is limited to 80 characters", () => {
    expect(parse({ title: "t".repeat(80) }).success).toBe(true);
    expect(fieldErrors(parse({ title: "t".repeat(81) }))).toContain("title");
  });

  test("inner newlines are kept and the ends are trimmed", () => {
    const r = parse({ body: "\n  line one\n\nline two  \n" });
    expect(r.success && r.data.body).toBe("line one\n\nline two");
  });

  test("browser line breaks (\\r\\n and lone \\r) are stored as \\n", () => {
    const r = parse({ body: "one\r\ntwo\rthree\nfour" });
    expect(r.success && r.data.body).toBe("one\ntwo\nthree\nfour");
  });

  test("the length limit counts normalized line breaks, not the extra carriage returns", () => {
    // 2500 lines of "ab" separated by CRLF is 2500*2 + 2499 characters after normalization (7499), so too long;
    // 1666 pairs of two-character lines stays under 5000 once the \r characters are gone
    const lines = Array.from({ length: 1666 }, () => "ab").join("\r\n");
    expect(lines.length).toBeGreaterThan(4990);
    expect(parse({ body: lines }).success).toBe(true);
  });
});
