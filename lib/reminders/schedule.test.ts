import { describe, expect, test } from "vitest";
import { planReminders, pruneReminded, type ReminderTask } from "./schedule";

const NOW = 1_000_000_000_000;
const MIN = 60_000;
const task = (key: string, fireInMin: number, startInMin: number): ReminderTask => ({
  key,
  title: `Event ${key}`,
  fireAt: NOW + fireInMin * MIN,
  startsAt: NOW + startInMin * MIN,
});

describe("planReminders", () => {
  test("a reminder due now or a little late fires immediately", () => {
    const { fireNow, later } = planReminders([task("a", 0, 15), task("b", -1, 14)], NOW, new Set());
    expect(fireNow.map((t) => t.key)).toEqual(["a", "b"]);
    expect(later).toEqual([]);
  });

  test("a future reminder waits for exactly the time remaining", () => {
    const { fireNow, later } = planReminders([task("a", 30, 45)], NOW, new Set());
    expect(fireNow).toEqual([]);
    expect(later).toEqual([{ ...task("a", 30, 45), delayMs: 30 * MIN }]);
  });

  test("an already reminded occurrence is never scheduled or fired again", () => {
    const { fireNow, later } = planReminders([task("a", 0, 15), task("b", 30, 45)], NOW, new Set(["a", "b"]));
    expect(fireNow).toEqual([]);
    expect(later).toEqual([]);
  });

  test("an event that has already started is dropped even if it was never reminded", () => {
    const { fireNow, later } = planReminders([task("a", -20, -5)], NOW, new Set());
    expect(fireNow).toEqual([]);
    expect(later).toEqual([]);
  });

  test("an event starting exactly now still fires", () => {
    expect(planReminders([task("a", -5, 0)], NOW, new Set()).fireNow).toHaveLength(1);
  });

  test("mixed input is split correctly and keeps order", () => {
    const { fireNow, later } = planReminders([task("x", 5, 20), task("y", 0, 10), task("z", 60, 75)], NOW, new Set());
    expect(fireNow.map((t) => t.key)).toEqual(["y"]);
    expect(later.map((t) => [t.key, t.delayMs])).toEqual([["x", 5 * MIN], ["z", 60 * MIN]]);
  });
});

describe("pruneReminded", () => {
  const DAY = 24 * 60 * MIN;

  test("drops entries older than the age limit and keeps the rest", () => {
    const entries = [{ key: "old", at: NOW - 4 * DAY }, { key: "recent", at: NOW - DAY }];
    expect(pruneReminded(entries, NOW, 3 * DAY)).toEqual([{ key: "recent", at: NOW - DAY }]);
  });

  test("an entry exactly at the limit is kept", () => {
    expect(pruneReminded([{ key: "edge", at: NOW - 3 * DAY }], NOW, 3 * DAY)).toHaveLength(1);
  });

  test("empty and malformed input are safe", () => {
    expect(pruneReminded([], NOW, DAY)).toEqual([]);
    expect(pruneReminded([{ key: "x", at: Number.NaN }], NOW, DAY)).toEqual([]);
  });
});
