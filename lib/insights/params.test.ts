import { describe, expect, test } from "vitest";
import { CORR_METRICS, parseCorrelationParams, parseLag, parsePerf } from "./params";

describe("parsePerf", () => {
  test("accepts week, month and year", () => {
    expect(parsePerf("week")).toBe("week");
    expect(parsePerf("month")).toBe("month");
    expect(parsePerf("year")).toBe("year");
  });

  test("falls back for junk, empty, undefined and uses the first array value", () => {
    expect(parsePerf("decade")).toBe("week");
    expect(parsePerf("")).toBe("week");
    expect(parsePerf(undefined)).toBe("week");
    expect(parsePerf(["year", "month"])).toBe("year");
    expect(parsePerf(["nope"])).toBe("week");
  });

  test("a custom fallback is used", () => {
    expect(parsePerf(undefined, "month")).toBe("month");
    expect(parsePerf("junk", "month")).toBe("month");
  });
});

describe("parseLag", () => {
  test("1 means next day; everything else is same day", () => {
    expect(parseLag("1")).toBe(1);
    expect(parseLag("0")).toBe(0);
    for (const bad of ["2", "x", "", "-1", undefined]) expect(parseLag(bad)).toBe(0);
    expect(parseLag(["1", "0"])).toBe(1);
  });
});

describe("parseCorrelationParams", () => {
  test("defaults to sleep vs study, same day", () => {
    expect(parseCorrelationParams({})).toEqual({ x: "sleep", y: "study", lag: 0 });
  });

  test("accepts every metric", () => {
    for (const m of CORR_METRICS) {
      const r = parseCorrelationParams({ cx: m, cy: "calories" });
      expect(r.x).toBe(m);
    }
  });

  test("unknown values fall back to the defaults", () => {
    expect(parseCorrelationParams({ cx: "zzz", cy: "qqq", lag: "9" })).toEqual({ x: "sleep", y: "study", lag: 0 });
  });

  test("x equal to y is resolved to two different metrics", () => {
    expect(parseCorrelationParams({ cx: "study", cy: "study" })).toEqual({ x: "study", y: "sleep", lag: 0 });
    expect(parseCorrelationParams({ cx: "mood", cy: "mood" })).toEqual({ x: "mood", y: "study", lag: 0 });
    expect(parseCorrelationParams({ cx: "sleep" })).toEqual({ x: "sleep", y: "study", lag: 0 });
  });

  test("lag 1 is kept", () => {
    expect(parseCorrelationParams({ lag: "1" }).lag).toBe(1);
  });
});
