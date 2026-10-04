import { describe, expect, test } from "vitest";
import { addDays, dayKey, rangeKeys, weekStartKey } from "./time";

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
