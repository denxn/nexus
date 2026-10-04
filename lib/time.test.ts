import { describe, expect, test } from "vitest";
import {
  addDays,
  addMonths,
  dayKey,
  isDayKey,
  monthKeyOf,
  monthMatrix,
  parseDay,
  parseMonth,
  rangeKeys,
  romeLocalToDate,
  toRomeLocalInput,
  weekStartKey,
} from "./time";

describe("Rome local time conversion", () => {
  test("23:30 Rome in summer (UTC+2) is 21:30Z", () => {
    expect(romeLocalToDate("2026-10-04T23:30").toISOString()).toBe("2026-10-04T21:30:00.000Z");
  });

  test("23:30 Rome in winter (UTC+1) is 22:30Z", () => {
    expect(romeLocalToDate("2026-01-15T23:30").toISOString()).toBe("2026-01-15T22:30:00.000Z");
  });

  test("00:30 on the DST-end day is still summer time", () => {
    expect(romeLocalToDate("2026-10-25T00:30").toISOString()).toBe("2026-10-24T22:30:00.000Z");
  });

  test("noon on the DST-end day is winter time", () => {
    expect(romeLocalToDate("2026-10-25T12:00").toISOString()).toBe("2026-10-25T11:00:00.000Z");
  });

  test("toRomeLocalInput formats an instant as Rome wall time", () => {
    expect(toRomeLocalInput(new Date("2026-10-04T21:30:00Z"))).toBe("2026-10-04T23:30");
  });

  test("the two conversions round-trip", () => {
    const d = new Date("2026-03-29T10:15:00Z");
    expect(romeLocalToDate(toRomeLocalInput(d)).toISOString()).toBe(d.toISOString());
  });
});

describe("dayKey (Europe/Rome)", () => {
  test("23:30 Rome in winter stays on the same local day", () => {
    expect(dayKey(new Date("2026-03-14T22:30:00Z"))).toBe("2026-03-14");
  });

  test("00:30 Rome rolls over to the next local day", () => {
    expect(dayKey(new Date("2026-03-14T23:30:00Z"))).toBe("2026-03-15");
  });

  test("on the DST-end night, 00:30 Rome is the new day", () => {
    expect(dayKey(new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-25");
  });
});

describe("key arithmetic", () => {
  test("weekStartKey returns the Monday of that week", () => {
    expect(weekStartKey("2026-10-04")).toBe("2026-09-28");
  });

  test("weekStartKey of a Monday is itself", () => {
    expect(weekStartKey("2026-09-28")).toBe("2026-09-28");
  });

  test("addDays crosses month boundaries", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  test("rangeKeys runs oldest to newest ending at endKey", () => {
    expect(rangeKeys("2026-10-04", 3)).toEqual([
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });
});

describe("month helpers", () => {
  test("isDayKey accepts real dates only", () => {
    expect(isDayKey("2028-02-29")).toBe(true);
    expect(isDayKey("2026-02-29")).toBe(false);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("2026-13-01")).toBe(false);
    expect(isDayKey("2026-2-3")).toBe(false);
    expect(isDayKey("x")).toBe(false);
  });

  test("monthKeyOf and addMonths cross year boundaries", () => {
    expect(monthKeyOf("2026-10-04")).toBe("2026-10");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-03", 0)).toBe("2026-03");
  });

  test("a month starting on Sunday spills into the previous month (Feb 2026)", () => {
    const m = monthMatrix("2026-02");
    expect(m).toHaveLength(5);
    expect(m[0][0]).toEqual({ day: "2026-01-26", inMonth: false });
    expect(m[0][6]).toEqual({ day: "2026-02-01", inMonth: true });
    expect(m[4][6]).toEqual({ day: "2026-03-01", inMonth: false });
  });

  test("a 28-day February starting on Monday is exactly 4 full rows (Feb 2027)", () => {
    const m = monthMatrix("2027-02");
    expect(m).toHaveLength(4);
    expect(m[0][0].day).toBe("2027-02-01");
    expect(m.flat().every((c) => c.inMonth)).toBe(true);
  });

  test("leap February includes the 29th (Feb 2028)", () => {
    const days = monthMatrix("2028-02").flat();
    expect(days.find((c) => c.day === "2028-02-29")?.inMonth).toBe(true);
  });

  test("every row has 7 cells and weeks start on Monday", () => {
    for (const month of ["2026-02", "2026-03", "2026-08", "2026-11"]) {
      for (const week of monthMatrix(month)) {
        expect(week).toHaveLength(7);
        expect(weekStartKey(week[0].day)).toBe(week[0].day);
      }
    }
  });

  test("parseMonth accepts YYYY-MM and falls back to the current month", () => {
    expect(parseMonth("2026-05")).toBe("2026-05");
    expect(parseMonth(["2026-06", "2026-07"])).toBe("2026-06");
    const current = monthKeyOf(dayKey(new Date()));
    expect(parseMonth("junk")).toBe(current);
    expect(parseMonth("2026-13")).toBe(current);
    expect(parseMonth(undefined)).toBe(current);
  });

  test("parseDay accepts real day keys and returns null otherwise", () => {
    expect(parseDay("2026-10-04")).toBe("2026-10-04");
    expect(parseDay("2026-02-30")).toBeNull();
    expect(parseDay(undefined)).toBeNull();
    expect(parseDay("")).toBeNull();
  });
});
