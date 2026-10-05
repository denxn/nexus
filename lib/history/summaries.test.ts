import { describe, expect, test } from "vitest";
import { DEFAULT_TARGETS } from "@/lib/targets";
import { summarizeSleep, summarizeStudy, summarizeWorkouts, type Entry } from "./summaries";

const e = (type: Entry["type"], iso: string, value: number, label: string | null = null): Entry => ({
  type,
  occurredAt: new Date(iso),
  value,
  label,
});
const finite = (o: Record<string, unknown>) =>
  Object.values(o).every((v) => typeof v !== "number" || Number.isFinite(v));

describe("summarizeWorkouts", () => {
  const TODAY = "2026-10-07"; // Wednesday; week starts Monday 2026-10-05

  test("totals, average, longest and sessions per week", () => {
    const entries = [30, 45, 60, 45].map((m, i) => e("WORKOUT", `2026-09-${10 + i}T14:00:00Z`, m));
    const s = summarizeWorkouts(entries, 28, DEFAULT_TARGETS, TODAY);
    expect(s).toMatchObject({ sessions: 4, totalMin: 180, avgMin: 45, longestMin: 60, perWeek: 1 });
  });

  test("perWeek is rounded to one decimal", () => {
    const entries = Array.from({ length: 5 }, (_, i) => e("WORKOUT", `2026-09-${10 + i}T14:00:00Z`, 30));
    expect(summarizeWorkouts(entries, 30, DEFAULT_TARGETS, TODAY).perWeek).toBe(1.2); // 5 / (30/7) = 1.1666...
  });

  test("weekCount counts only Monday through today and weekTarget comes from the targets", () => {
    const entries = [
      e("WORKOUT", "2026-10-03T14:00:00Z", 30), // previous Saturday
      e("WORKOUT", "2026-10-05T14:00:00Z", 30),
      e("WORKOUT", "2026-10-06T14:00:00Z", 30),
    ];
    const s = summarizeWorkouts(entries, 30, DEFAULT_TARGETS, TODAY);
    expect(s.weekCount).toBe(2);
    expect(s.weekTarget).toBe(4);
  });

  test("ignores entries of other types", () => {
    expect(summarizeWorkouts([e("STUDY", "2026-10-06T10:00:00Z", 90)], 30, DEFAULT_TARGETS, TODAY).sessions).toBe(0);
  });

  test("empty input gives zeros and finite numbers", () => {
    const s = summarizeWorkouts([], 30, DEFAULT_TARGETS, TODAY);
    expect(s).toMatchObject({ sessions: 0, totalMin: 0, avgMin: 0, longestMin: 0, perWeek: 0, weekCount: 0 });
    expect(finite(s)).toBe(true);
  });

  test("a single session", () => {
    const s = summarizeWorkouts([e("WORKOUT", "2026-10-06T14:00:00Z", 50)], 7, DEFAULT_TARGETS, TODAY);
    expect(s).toMatchObject({ sessions: 1, totalMin: 50, avgMin: 50, longestMin: 50, perWeek: 1 });
  });
});

describe("summarizeStudy (float noise)", () => {
  test("decimal minutes that add up to the target count as meeting it", () => {
    const s = summarizeStudy(
      [e("STUDY", "2026-10-04T08:00:00Z", 0.1), e("STUDY", "2026-10-04T09:00:00Z", 239.7), e("STUDY", "2026-10-04T10:00:00Z", 0.2)],
      DEFAULT_TARGETS,
    );
    expect(s.best?.minutes).toBe(240);
    expect(s.daysMetTarget).toBe(1);
  });
});

describe("summarizeStudy", () => {
  test("entries on one day add up; average divides by study days, not window days", () => {
    const s = summarizeStudy(
      [e("STUDY", "2026-10-04T08:00:00Z", 60), e("STUDY", "2026-10-04T12:00:00Z", 90), e("STUDY", "2026-10-05T09:00:00Z", 30)],
      DEFAULT_TARGETS,
    );
    expect(s.totalMin).toBe(180);
    expect(s.studyDays).toBe(2);
    expect(s.avgPerStudyDay).toBe(90);
    expect(s.best).toEqual({ day: "2026-10-04", minutes: 150 });
  });

  test("best day ties go to the earlier day", () => {
    const s = summarizeStudy([e("STUDY", "2026-10-05T09:00:00Z", 60), e("STUDY", "2026-10-03T09:00:00Z", 60)], DEFAULT_TARGETS);
    expect(s.best?.day).toBe("2026-10-03");
  });

  test("a day counts as meeting the target at exactly 240 minutes, not at 239", () => {
    const s = summarizeStudy(
      [e("STUDY", "2026-10-03T09:00:00Z", 240), e("STUDY", "2026-10-04T09:00:00Z", 239), e("STUDY", "2026-10-05T09:00:00Z", 100), e("STUDY", "2026-10-05T15:00:00Z", 140)],
      DEFAULT_TARGETS,
    );
    expect(s.daysMetTarget).toBe(2); // 10-03 (240) and 10-05 (100 + 140)
  });

  test("subjects group labels case-insensitively and cap at 5", () => {
    const labels = ["Maths", "maths ", "Physics", "Chem", "Bio", "Art", "Music"];
    const s = summarizeStudy(labels.map((l, i) => e("STUDY", `2026-10-0${1 + (i % 5)}T09:00:00Z`, 10 + i, l)), DEFAULT_TARGETS);
    expect(s.subjects).toHaveLength(5);
    expect(s.subjects.find((x) => x.key === "maths")).toMatchObject({ count: 2, total: 21 });
  });

  test("empty input gives zeros, a null best day and finite numbers", () => {
    const s = summarizeStudy([], DEFAULT_TARGETS);
    expect(s).toMatchObject({ totalMin: 0, studyDays: 0, avgPerStudyDay: 0, best: null, daysMetTarget: 0, subjects: [] });
    expect(finite(s)).toBe(true);
  });
});

describe("summarizeSleep", () => {
  const sleep = (iso: string, h: number) => e("SLEEP", iso, h);

  test("float noise in a day's sum does not hide a night that adds up to the target", () => {
    // 0.6 + 4.1 + 3.3 is 7.999999999999999 in floating point
    const s = summarizeSleep(
      [sleep("2026-10-04T01:00:00Z", 0.6), sleep("2026-10-04T05:00:00Z", 4.1), sleep("2026-10-04T13:00:00Z", 3.3)],
      DEFAULT_TARGETS,
    );
    expect(s.best?.hours).toBe(8);
    expect(s.daysMetTarget).toBe(1);
    expect(s.debtHours).toBe(0);
  });

  test("average over days with sleep logged; several entries on a day add up", () => {
    const s = summarizeSleep([sleep("2026-10-04T05:00:00Z", 6), sleep("2026-10-04T13:00:00Z", 1), sleep("2026-10-05T05:00:00Z", 8)], DEFAULT_TARGETS);
    expect(s.days).toBe(2);
    expect(s.avgHours).toBeCloseTo(7.5, 10); // (7 + 8) / 2
  });

  test("best and worst day; ties go to the earlier day", () => {
    const s = summarizeSleep([sleep("2026-10-03T05:00:00Z", 9), sleep("2026-10-04T05:00:00Z", 5), sleep("2026-10-05T05:00:00Z", 9), sleep("2026-10-06T05:00:00Z", 5)], DEFAULT_TARGETS);
    expect(s.best).toEqual({ day: "2026-10-03", hours: 9 });
    expect(s.worst).toEqual({ day: "2026-10-04", hours: 5 });
  });

  test("the target counts at exactly 8 h and not at 7.99", () => {
    const s = summarizeSleep([sleep("2026-10-03T05:00:00Z", 8), sleep("2026-10-04T05:00:00Z", 7.99), sleep("2026-10-05T05:00:00Z", 8.5)], DEFAULT_TARGETS);
    expect(s.daysMetTarget).toBe(2);
  });

  test("debt counts only shortfalls: 7 h and 9 h against 8 is 1 h of debt, not 0", () => {
    const s = summarizeSleep([sleep("2026-10-03T05:00:00Z", 7), sleep("2026-10-04T05:00:00Z", 9)], DEFAULT_TARGETS);
    expect(s.debtHours).toBeCloseTo(1, 10);
  });

  test("average wake-up time is the mean of the Rome clock times", () => {
    // 04:00Z and 05:00Z on a CEST date are 06:00 and 07:00 in Rome
    const s = summarizeSleep([sleep("2026-10-04T04:00:00Z", 7), sleep("2026-10-05T05:00:00Z", 8)], DEFAULT_TARGETS);
    expect(s.avgWakeMinutes).toBe(390);
  });

  test("empty input gives zeros, nulls and finite numbers", () => {
    const s = summarizeSleep([], DEFAULT_TARGETS);
    expect(s).toMatchObject({ days: 0, avgHours: 0, best: null, worst: null, daysMetTarget: 0, debtHours: 0, avgWakeMinutes: null });
    expect(finite(s)).toBe(true);
  });

  test("ignores entries of other types", () => {
    expect(summarizeSleep([e("STUDY", "2026-10-04T05:00:00Z", 9)], DEFAULT_TARGETS).days).toBe(0);
  });
});
