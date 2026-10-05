import { describe, expect, test } from "vitest";
import { parseWeekdayList } from "./weekdays";

describe("parseWeekdayList", () => {
  test("an empty or blank list is no weekdays (not Monday)", () => {
    expect(parseWeekdayList("")).toEqual([]);
    expect(parseWeekdayList("   ")).toEqual([]);
    expect(parseWeekdayList(",")).toEqual([]);
    expect(parseWeekdayList(undefined)).toEqual([]);
  });

  test("a comma list becomes sorted unique weekdays", () => {
    expect(parseWeekdayList("0,2,4")).toEqual([0, 2, 4]);
    expect(parseWeekdayList("4, 0 ,2,0")).toEqual([0, 2, 4]);
  });

  test("anything that is not a weekday 0 to 6 is dropped", () => {
    expect(parseWeekdayList("7,-1,x,2.5,3")).toEqual([3]);
  });
});
