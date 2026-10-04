import { describe, expect, test } from "vitest";
import { aggregateDaily, summarizeCards, type EntryLike } from "./stats";
import { DEFAULT_TARGETS } from "./targets";
import { rangeKeys } from "./time";

const TODAY = "2026-10-04"; // a Sunday
const e = (
  type: EntryLike["type"],
  iso: string,
  value: number,
): EntryLike => ({ type, occurredAt: new Date(iso), value });

describe("aggregateDaily", () => {
  test("sums two study entries on the same day", () => {
    const rows = aggregateDaily(
      [
        e("STUDY", "2026-10-04T08:00:00Z", 60),
        e("STUDY", "2026-10-04T15:00:00Z", 90),
      ],
      [TODAY],
    );
    expect(rows[0].studyMin).toBe(150);
  });

  test("a sleep entry at 06:30 Rome counts on that day", () => {
    const rows = aggregateDaily(
      [e("SLEEP", "2026-10-04T04:30:00Z", 7)],
      rangeKeys(TODAY, 2),
    );
    expect(rows.map((r) => r.sleepH)).toEqual([0, 7]);
  });

  test("an empty day is zero-filled with a null mood", () => {
    expect(aggregateDaily([], [TODAY])[0]).toEqual({
      day: TODAY,
      workoutMin: 0,
      workoutCount: 0,
      studyMin: 0,
      sleepH: 0,
      kcal: 0,
      mood: null,
    });
  });

  test("two mood entries average", () => {
    const rows = aggregateDaily(
      [
        e("MOOD", "2026-10-04T08:00:00Z", 6),
        e("MOOD", "2026-10-04T18:00:00Z", 8),
      ],
      [TODAY],
    );
    expect(rows[0].mood).toBe(7);
  });

  test("workouts add minutes and count", () => {
    const rows = aggregateDaily(
      [
        e("WORKOUT", "2026-10-04T08:00:00Z", 45),
        e("WORKOUT", "2026-10-04T17:00:00Z", 30),
      ],
      [TODAY],
    );
    expect(rows[0].workoutMin).toBe(75);
    expect(rows[0].workoutCount).toBe(2);
  });

  test("entries outside the requested days are ignored", () => {
    const rows = aggregateDaily(
      [e("MEAL", "2026-09-01T10:00:00Z", 800)],
      [TODAY],
    );
    expect(rows[0].kcal).toBe(0);
  });
});

describe("summarizeCards", () => {
  test("over-target study reports the real value and uncapped percent", () => {
    const stats = aggregateDaily(
      [e("STUDY", "2026-10-04T08:00:00Z", 300)],
      rangeKeys(TODAY, 7),
    );
    const cards = summarizeCards(stats, DEFAULT_TARGETS);
    expect(cards.study.value).toBe(300);
    expect(cards.study.target).toBe(240);
    expect(cards.study.pct).toBe(125);
  });

  test("a day with no entries gives 0 percent, never NaN", () => {
    const stats = aggregateDaily([], rangeKeys(TODAY, 7));
    const cards = summarizeCards(stats, DEFAULT_TARGETS);
    expect(cards.sleep.pct).toBe(0);
    expect(cards.calories.pct).toBe(0);
    expect(cards.workout.pct).toBe(0);
  });

  test("workout value counts only Monday through today", () => {
    const stats = aggregateDaily(
      [
        e("WORKOUT", "2026-09-27T10:00:00Z", 60), // previous Sunday
        e("WORKOUT", "2026-09-29T10:00:00Z", 60), // this Tuesday
      ],
      rangeKeys(TODAY, 8),
    );
    const cards = summarizeCards(stats, DEFAULT_TARGETS);
    expect(cards.workout.value).toBe(1);
    expect(cards.workout.target).toBe(4);
    expect(cards.workout.pct).toBe(25);
  });

  test("week holds the last 7 days of values, workout in minutes", () => {
    const stats = aggregateDaily(
      [e("WORKOUT", "2026-10-04T10:00:00Z", 45)],
      rangeKeys(TODAY, 7),
    );
    const cards = summarizeCards(stats, DEFAULT_TARGETS);
    expect(cards.workout.week).toEqual([0, 0, 0, 0, 0, 0, 45]);
  });
});
