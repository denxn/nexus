import { describe, expect, test } from "vitest";
import { groupByDay } from "./group";

const e = (id: string, iso: string, value: number) => ({ id, occurredAt: new Date(iso), value });

describe("groupByDay", () => {
  test("23:30 Rome stays on its day; 00:30 Rome is the next day", () => {
    const g = groupByDay([e("late", "2026-10-04T21:30:00Z", 10), e("after", "2026-10-04T22:30:00Z", 20)]);
    expect(g.map((x) => x.day)).toEqual(["2026-10-05", "2026-10-04"]);
    expect(g[1].entries.map((x) => x.id)).toEqual(["late"]);
  });

  test("newest day first, newest entry first inside a day, with the day's total", () => {
    const g = groupByDay([
      e("a", "2026-10-03T08:00:00Z", 30),
      e("b", "2026-10-04T08:00:00Z", 40),
      e("c", "2026-10-04T12:00:00Z", 50),
    ]);
    expect(g.map((x) => x.day)).toEqual(["2026-10-04", "2026-10-03"]);
    expect(g[0].entries.map((x) => x.id)).toEqual(["c", "b"]);
    expect(g[0].total).toBe(90);
    expect(g[1].total).toBe(30);
  });

  test("the DST-end day groups correctly (2026-10-25)", () => {
    const g = groupByDay([e("early", "2026-10-24T22:30:00Z", 1), e("noon", "2026-10-25T11:00:00Z", 2)]);
    expect(g).toHaveLength(1);
    expect(g[0].day).toBe("2026-10-25");
    expect(g[0].total).toBe(3);
  });

  test("empty input gives no groups and the input is not mutated", () => {
    expect(groupByDay([])).toEqual([]);
    const input = [e("a", "2026-10-03T08:00:00Z", 1), e("b", "2026-10-04T08:00:00Z", 1)];
    groupByDay(input);
    expect(input.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
