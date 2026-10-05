import { describe, expect, test } from "vitest";
import { chartAxis } from "./chartAxis";

describe("chartAxis (minutes)", () => {
  test("the axis always reaches the target, even when no day does", () => {
    const a = chartAxis([30, 90, 60], 240, "min");
    expect(a.max).toBe(240);
    expect(a.ticks).toEqual([0, 60, 120, 180, 240]);
  });

  test("when data exceeds the target the axis reaches the data", () => {
    const a = chartAxis([30, 310], 240, "min");
    expect(a.max).toBe(360);
    expect(a.ticks?.at(-1)).toBe(360);
  });

  test("no target and no data still gives a sane axis", () => {
    const a = chartAxis([], undefined, "min");
    expect(a.max).toBe(60);
    expect(a.ticks).toEqual([0, 60]);
    expect(chartAxis([0, 0], undefined, "min").max).toBe(60);
  });

  test("the tick step widens for long days", () => {
    expect(chartAxis([400], undefined, "min").ticks).toEqual([0, 120, 240, 360, 480]);
    expect(chartAxis([1000], undefined, "min").ticks?.at(-1)).toBe(1200);
  });

  test("every tick is a whole number of hours and the last tick equals max", () => {
    for (const values of [[10], [239], [241], [481], [5000]]) {
      const a = chartAxis(values, 240, "min");
      expect(a.ticks?.every((t) => t % 60 === 0)).toBe(true);
      expect(a.ticks?.at(-1)).toBe(a.max);
    }
  });
});

describe("chartAxis (hours)", () => {
  test("the sleep axis reaches the target when sleep stays below it", () => {
    expect(chartAxis([3, 4, 2.5], 8, "h").max).toBe(8);
  });

  test("rounds up to a whole hour when data exceeds the target", () => {
    expect(chartAxis([9.2, 6], 8, "h").max).toBe(10);
  });

  test("an empty chart has a minimum height of 1 and automatic ticks", () => {
    const a = chartAxis([], undefined, "h");
    expect(a.max).toBe(1);
    expect(a.ticks).toBeUndefined();
  });
});
