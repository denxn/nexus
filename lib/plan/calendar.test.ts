import { describe, expect, test } from "vitest";
import { buildMarkers, summarizeDay } from "./calendar";

const DAYS = ["2026-10-03", "2026-10-04", "2026-10-05"];

describe("buildMarkers", () => {
  test("every requested day gets an entry, all false by default", () => {
    expect(buildMarkers(DAYS, [], [], [])).toEqual({
      "2026-10-03": { event: false, todo: false, logged: false, note: false },
      "2026-10-04": { event: false, todo: false, logged: false, note: false },
      "2026-10-05": { event: false, todo: false, logged: false, note: false },
    });
  });

  test("an event marks its Rome start day (23:30 Rome counts that day, not the UTC day)", () => {
    const m = buildMarkers(DAYS, [{ startsAt: new Date("2026-10-04T21:30:00Z") }], [], []);
    expect(m["2026-10-04"].event).toBe(true);
    expect(m["2026-10-05"].event).toBe(false);
  });

  test("an event at 00:30 Rome belongs to the new Rome day", () => {
    const m = buildMarkers(DAYS, [{ startsAt: new Date("2026-10-04T22:30:00Z") }], [], []);
    expect(m["2026-10-05"].event).toBe(true);
    expect(m["2026-10-04"].event).toBe(false);
  });

  test("an open todo marks its due day; a done todo does not", () => {
    const m = buildMarkers(DAYS, [], [
      { dueDate: "2026-10-04", done: false },
      { dueDate: "2026-10-05", done: true },
      { dueDate: null, done: false },
    ], []);
    expect(m["2026-10-04"].todo).toBe(true);
    expect(m["2026-10-05"].todo).toBe(false);
  });

  test("any logged entry marks its Rome day", () => {
    const m = buildMarkers(DAYS, [], [], [{ occurredAt: new Date("2026-10-03T08:00:00Z") }]);
    expect(m["2026-10-03"].logged).toBe(true);
    expect(m["2026-10-04"].logged).toBe(false);
  });

  test("items outside the requested days are ignored", () => {
    const m = buildMarkers(DAYS, [{ startsAt: new Date("2026-11-01T10:00:00Z") }], [{ dueDate: "2026-11-01", done: false }], []);
    expect(Object.values(m).every((d) => !d.event && !d.todo)).toBe(true);
  });
});

describe("buildMarkers with notes", () => {
  test("a note marks its day", () => {
    const m = buildMarkers(DAYS, [], [], [], [{ day: "2026-10-04" }]);
    expect(m["2026-10-04"].note).toBe(true);
    expect(m["2026-10-03"].note).toBe(false);
  });

  test("several notes on one day mark it once", () => {
    const m = buildMarkers(DAYS, [], [], [], [{ day: "2026-10-04" }, { day: "2026-10-04" }]);
    expect(m["2026-10-04"].note).toBe(true);
  });

  test("notes outside the requested days are ignored", () => {
    const m = buildMarkers(DAYS, [], [], [], [{ day: "2026-11-01" }]);
    expect(Object.values(m).every((d) => !d.note)).toBe(true);
  });

  test("omitting the notes argument leaves every note flag false", () => {
    expect(Object.values(buildMarkers(DAYS, [], [], [])).every((d) => d.note === false)).toBe(true);
  });
});

describe("summarizeDay", () => {
  const e = (type: "WORKOUT" | "STUDY" | "SLEEP" | "MEAL" | "MOOD", iso: string, value: number) => ({ type, occurredAt: new Date(iso), value });

  test("totals per type for the given Rome day, in a fixed order", () => {
    const rows = summarizeDay("2026-10-04", [
      e("MEAL", "2026-10-04T10:00:00Z", 800),
      e("STUDY", "2026-10-04T08:00:00Z", 60),
      e("STUDY", "2026-10-04T12:00:00Z", 90),
      e("WORKOUT", "2026-10-04T15:00:00Z", 45),
      e("SLEEP", "2026-10-04T05:00:00Z", 7.5),
      e("MOOD", "2026-10-04T18:00:00Z", 6),
      e("MOOD", "2026-10-04T19:00:00Z", 8),
    ]);
    expect(rows).toEqual([
      { type: "WORKOUT", text: "Workout 45 m" },
      { type: "STUDY", text: "Study 2 h 30 m" },
      { type: "SLEEP", text: "Sleep 7.5 h" },
      { type: "MEAL", text: "Calories 800 kcal" },
      { type: "MOOD", text: "Mood 7/10" },
    ]);
  });

  test("other days and an empty day give nothing", () => {
    expect(summarizeDay("2026-10-04", [e("STUDY", "2026-10-03T08:00:00Z", 60)])).toEqual([]);
    expect(summarizeDay("2026-10-04", [])).toEqual([]);
  });
});
