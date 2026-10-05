import { describe, expect, test } from "vitest";
import { expandEvent } from "./events";
import type { Rule } from "./rule";

type Ev = Parameters<typeof expandEvent>[0];
const ev = (over: Partial<Ev> = {}): Ev => ({
  startsAt: new Date("2026-10-07T07:00:00Z"), // Wednesday 09:00 Rome (CEST)
  endsAt: new Date("2026-10-07T08:30:00Z"), // 10:30
  skippedDays: [],
  repeat: "WEEKLY",
  interval: 1,
  weekdays: [],
  until: null,
  monthDay: null,
  ...over,
});
const iso = (d: Date | null) => d?.toISOString() ?? null;

describe("expandEvent", () => {
  test("a weekly event keeps its Rome wall-clock time across the DST change on 2026-10-25", () => {
    const occ = expandEvent(ev(), "2026-10-07", "2026-10-28");
    expect(occ.map((o) => o.day)).toEqual(["2026-10-07", "2026-10-14", "2026-10-21", "2026-10-28"]);
    expect(occ.map((o) => iso(o.startsAt))).toEqual([
      "2026-10-07T07:00:00.000Z",
      "2026-10-14T07:00:00.000Z",
      "2026-10-21T07:00:00.000Z",
      "2026-10-28T08:00:00.000Z", // 09:00 CET
    ]);
    expect(iso(occ[3].endsAt)).toBe("2026-10-28T09:30:00.000Z"); // 10:30 CET
  });

  test("a daily 02:30 event exists on the spring-forward day (the clock jumps to 03:30)", () => {
    const e = ev({ startsAt: new Date("2026-03-27T01:30:00Z"), endsAt: null, repeat: "DAILY" }); // 02:30 CET
    const occ = expandEvent(e, "2026-03-28", "2026-03-30");
    expect(occ.map((o) => o.day)).toEqual(["2026-03-28", "2026-03-29", "2026-03-30"]);
    expect(iso(occ[0].startsAt)).toBe("2026-03-28T01:30:00.000Z");
    expect(iso(occ[2].startsAt)).toBe("2026-03-30T00:30:00.000Z"); // 02:30 CEST
    expect(occ[0].endsAt).toBeNull();
  });

  test("a non-recurring event yields itself once, only when in range", () => {
    const e = ev({ repeat: "NONE" });
    expect(expandEvent(e, "2026-10-01", "2026-10-31")).toHaveLength(1);
    expect(expandEvent(e, "2026-10-08", "2026-10-31")).toEqual([]);
  });

  test("skipped days and until apply", () => {
    const occ = expandEvent(ev({ skippedDays: ["2026-10-14"], until: "2026-10-21" }), "2026-10-01", "2026-12-31");
    expect(occ.map((o) => o.day)).toEqual(["2026-10-07", "2026-10-21"]);
  });

  test("an event at 23:30 Rome keeps its Rome day (not the UTC day)", () => {
    const e = ev({ startsAt: new Date("2026-10-07T21:30:00Z"), endsAt: null, repeat: "DAILY" }); // 23:30 CEST
    const occ = expandEvent(e, "2026-10-07", "2026-10-08");
    expect(occ.map((o) => o.day)).toEqual(["2026-10-07", "2026-10-08"]);
    expect(iso(occ[1].startsAt)).toBe("2026-10-08T21:30:00.000Z");
  });

  test("monthly events clamp like the rule does", () => {
    const e = ev({ startsAt: new Date("2026-01-31T08:00:00Z"), endsAt: null, repeat: "MONTHLY" });
    expect(expandEvent(e, "2026-01-01", "2026-03-31").map((o) => o.day)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });
});
