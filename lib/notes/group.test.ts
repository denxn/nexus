import { describe, expect, test } from "vitest";
import { groupNotesByDay } from "./group";

const n = (id: string, day: string, iso: string) => ({ id, day, createdAt: new Date(iso) });

describe("groupNotesByDay", () => {
  test("newest day first and newest created first inside a day", () => {
    const g = groupNotesByDay([
      n("a", "2026-10-03", "2026-10-03T08:00:00Z"),
      n("b", "2026-10-05", "2026-10-05T08:00:00Z"),
      n("c", "2026-10-05", "2026-10-05T20:00:00Z"),
    ]);
    expect(g.map((x) => x.day)).toEqual(["2026-10-05", "2026-10-03"]);
    expect(g[0].notes.map((x) => x.id)).toEqual(["c", "b"]);
  });

  test("a back-dated note groups by its day, not its creation time", () => {
    const g = groupNotesByDay([n("late", "2026-10-01", "2026-10-05T23:30:00Z"), n("new", "2026-10-05", "2026-10-05T08:00:00Z")]);
    expect(g.map((x) => x.day)).toEqual(["2026-10-05", "2026-10-01"]);
  });

  test("equal creation times keep input order", () => {
    const g = groupNotesByDay([n("a", "2026-10-05", "2026-10-05T08:00:00Z"), n("b", "2026-10-05", "2026-10-05T08:00:00Z")]);
    expect(g[0].notes.map((x) => x.id)).toEqual(["a", "b"]);
  });

  test("empty input gives no groups and the input is not mutated", () => {
    expect(groupNotesByDay([])).toEqual([]);
    const input = [n("a", "2026-10-03", "2026-10-03T08:00:00Z"), n("b", "2026-10-05", "2026-10-05T08:00:00Z")];
    groupNotesByDay(input);
    expect(input.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
