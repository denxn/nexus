import { describe, expect, test } from "vitest";
import { expandOccurrences, nextOccurrence, weekdayOf, type Rule } from "./rule";

const rule = (over: Partial<Rule> = {}): Rule => ({ repeat: "DAILY", interval: 1, weekdays: [], until: null, monthDay: null, ...over });

describe("weekdayOf (0 = Monday)", () => {
  test("known days", () => {
    expect(weekdayOf("2026-10-05")).toBe(0); // Monday
    expect(weekdayOf("2026-10-07")).toBe(2); // Wednesday
    expect(weekdayOf("2026-10-04")).toBe(6); // Sunday
  });
});

describe("expandOccurrences: none", () => {
  test("only the anchor, if it is in range and not skipped", () => {
    expect(expandOccurrences(rule({ repeat: "NONE" }), "2026-10-05", "2026-10-01", "2026-10-31")).toEqual(["2026-10-05"]);
    expect(expandOccurrences(rule({ repeat: "NONE" }), "2026-10-05", "2026-10-06", "2026-10-31")).toEqual([]);
    expect(expandOccurrences(rule({ repeat: "NONE" }), "2026-10-05", "2026-10-01", "2026-10-31", ["2026-10-05"])).toEqual([]);
  });
});

describe("expandOccurrences: daily", () => {
  test("every day inside the range", () => {
    expect(expandOccurrences(rule(), "2026-10-01", "2026-10-03", "2026-10-06")).toEqual(["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06"]);
  });

  test("every 3 days stays aligned to the anchor, whatever the range start", () => {
    expect(expandOccurrences(rule({ interval: 3 }), "2026-10-01", "2026-10-02", "2026-10-08")).toEqual(["2026-10-04", "2026-10-07"]);
    expect(expandOccurrences(rule({ interval: 3 }), "2026-10-01", "2026-10-01", "2026-10-10")).toEqual(["2026-10-01", "2026-10-04", "2026-10-07", "2026-10-10"]);
  });

  test("never before the anchor", () => {
    expect(expandOccurrences(rule(), "2026-10-05", "2026-10-01", "2026-10-07")).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
    expect(expandOccurrences(rule(), "2026-10-05", "2026-09-01", "2026-10-04")).toEqual([]);
  });

  test("until is inclusive", () => {
    expect(expandOccurrences(rule({ until: "2026-10-04" }), "2026-10-02", "2026-10-01", "2026-10-10")).toEqual(["2026-10-02", "2026-10-03", "2026-10-04"]);
  });

  test("skipped days are removed", () => {
    expect(expandOccurrences(rule(), "2026-10-01", "2026-10-01", "2026-10-04", ["2026-10-02"])).toEqual(["2026-10-01", "2026-10-03", "2026-10-04"]);
  });

  test("crosses a year boundary and a reversed range is empty", () => {
    expect(expandOccurrences(rule(), "2026-12-30", "2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
    expect(expandOccurrences(rule(), "2026-10-01", "2026-10-09", "2026-10-03")).toEqual([]);
  });
});

describe("expandOccurrences: weekly", () => {
  const weekly = (over: Partial<Rule> = {}) => rule({ repeat: "WEEKLY", ...over });

  test("an empty weekday set means the anchor's weekday", () => {
    expect(expandOccurrences(weekly(), "2026-10-05", "2026-10-05", "2026-10-26")).toEqual(["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
  });

  test("several weekdays", () => {
    expect(expandOccurrences(weekly({ weekdays: [0, 2] }), "2026-10-05", "2026-10-05", "2026-10-15")).toEqual(["2026-10-05", "2026-10-07", "2026-10-12", "2026-10-14"]);
  });

  test("every 2 weeks skips the odd weeks", () => {
    expect(expandOccurrences(weekly({ interval: 2, weekdays: [0] }), "2026-10-05", "2026-10-05", "2026-11-05")).toEqual(["2026-10-05", "2026-10-19", "2026-11-02"]);
  });

  test("a weekday later in the anchor's own week counts; an earlier one waits for the next cycle", () => {
    // anchor Monday 10-05, Wednesday is later in that week
    expect(expandOccurrences(weekly({ weekdays: [2] }), "2026-10-05", "2026-10-05", "2026-10-14")).toEqual(["2026-10-07", "2026-10-14"]);
    // anchor Wednesday 10-07, Monday of that week is before the anchor
    expect(expandOccurrences(weekly({ weekdays: [0] }), "2026-10-07", "2026-10-05", "2026-10-20")).toEqual(["2026-10-12", "2026-10-19"]);
  });

  test("every 2 weeks across a year boundary", () => {
    expect(expandOccurrences(weekly({ interval: 2, weekdays: [0] }), "2026-12-21", "2026-12-21", "2027-01-20")).toEqual(["2026-12-21", "2027-01-04", "2027-01-18"]);
  });

  test("Sunday handling (week starts Monday)", () => {
    expect(expandOccurrences(weekly({ weekdays: [6] }), "2026-10-04", "2026-10-04", "2026-10-18")).toEqual(["2026-10-04", "2026-10-11", "2026-10-18"]);
  });
});

describe("expandOccurrences: monthly", () => {
  const monthly = (over: Partial<Rule> = {}) => rule({ repeat: "MONTHLY", ...over });

  test("the 31st clamps to the last day of shorter months", () => {
    expect(expandOccurrences(monthly(), "2026-01-31", "2026-01-01", "2026-04-30")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  test("leap February keeps the 29th", () => {
    expect(expandOccurrences(monthly(), "2028-01-31", "2028-02-01", "2028-02-29")).toEqual(["2028-02-29"]);
    expect(expandOccurrences(monthly({ interval: 12 }), "2028-02-29", "2028-01-01", "2030-12-31")).toEqual(["2028-02-29", "2029-02-28", "2030-02-28"]);
  });

  test("monthDay keeps the intended day after a clamped occurrence", () => {
    // a to-do created on the 31st, rolled to Feb 28, must go back to the 31st in March
    expect(expandOccurrences(monthly({ monthDay: 31 }), "2026-02-28", "2026-02-01", "2026-04-30")).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  test("every 3 months", () => {
    expect(expandOccurrences(monthly({ interval: 3 }), "2026-01-15", "2026-01-01", "2026-12-31")).toEqual(["2026-01-15", "2026-04-15", "2026-07-15", "2026-10-15"]);
  });

  test("until and skipped days apply", () => {
    expect(expandOccurrences(monthly({ until: "2026-03-15" }), "2026-01-10", "2026-01-01", "2026-12-31", ["2026-02-10"])).toEqual(["2026-01-10", "2026-03-10"]);
  });

  test("a range months after the anchor stays aligned", () => {
    expect(expandOccurrences(monthly({ interval: 2 }), "2026-01-20", "2026-06-01", "2026-09-30")).toEqual(["2026-07-20", "2026-09-20"]);
  });
});

describe("nextOccurrence", () => {
  test("the first occurrence strictly after the given day", () => {
    expect(nextOccurrence(rule(), "2026-10-01", "2026-10-03")).toBe("2026-10-04");
    expect(nextOccurrence(rule({ repeat: "WEEKLY", weekdays: [0] }), "2026-10-05", "2026-10-05")).toBe("2026-10-12");
    expect(nextOccurrence(rule({ repeat: "MONTHLY" }), "2026-01-31", "2026-01-31")).toBe("2026-02-28");
  });

  test("an 'after' before the anchor returns the anchor", () => {
    expect(nextOccurrence(rule(), "2026-10-05", "2026-09-01")).toBe("2026-10-05");
  });

  test("null once past until, and for a one-off whose day has passed", () => {
    expect(nextOccurrence(rule({ until: "2026-10-04" }), "2026-10-01", "2026-10-04")).toBeNull();
    expect(nextOccurrence(rule({ repeat: "NONE" }), "2026-10-05", "2026-10-05")).toBeNull();
  });

  test("skipped days are passed over", () => {
    expect(nextOccurrence(rule(), "2026-10-01", "2026-10-01", ["2026-10-02", "2026-10-03"])).toBe("2026-10-04");
  });

  test("finds a far-off occurrence (every 52 weeks)", () => {
    expect(nextOccurrence(rule({ repeat: "WEEKLY", interval: 52, weekdays: [0] }), "2026-10-05", "2026-10-05")).toBe("2027-10-04");
  });
});
