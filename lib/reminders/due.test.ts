import { describe, expect, test } from "vitest";
import { upcomingReminders } from "./due";

const NOW = new Date("2026-10-05T10:00:00Z");
const MIN = 60_000;
const at = (offsetMin: number) => new Date(NOW.getTime() + offsetMin * MIN);
const item = (id: string, startOffsetMin: number, remindMinutes: number | null) => ({
  id,
  title: `Event ${id}`,
  startsAt: at(startOffsetMin),
  remindMinutes,
});
const HORIZON = 48 * 60 * MIN;

describe("upcomingReminders", () => {
  test("an event whose reminder time is in the future is listed with its fire time", () => {
    const [r] = upcomingReminders([item("a", 60, 15)], NOW, HORIZON);
    expect(r.fireAt.toISOString()).toBe(at(45).toISOString());
    expect(r.key).toBe(`a:${at(60).toISOString()}`);
    expect(r.title).toBe("Event a");
  });

  test("a reminder due exactly now is included", () => {
    expect(upcomingReminders([item("a", 15, 15)], NOW, HORIZON)).toHaveLength(1);
  });

  test("a reminder up to 60 seconds late is still included; 61 seconds late is not", () => {
    // fireAt = start - remind. start in 20 min, remind 20 min + 60 s late? build by fire offsets
    const late60 = { id: "l", title: "x", startsAt: at(30), remindMinutes: 31 }; // fires 1 minute ago
    const late61 = { id: "m", title: "x", startsAt: new Date(at(30).getTime() + 0), remindMinutes: 31 };
    expect(upcomingReminders([late60], NOW, HORIZON)).toHaveLength(1);
    const tooLate = { id: "t", title: "x", startsAt: new Date(NOW.getTime() + 29 * MIN - 1000), remindMinutes: 30 }; // fired 61 s ago
    expect(upcomingReminders([tooLate], NOW, HORIZON)).toHaveLength(0);
    expect(late61.id).toBe("m");
  });

  test("an event that has already started is never listed", () => {
    expect(upcomingReminders([item("a", -1, 15), item("b", 5, 5)], NOW, HORIZON).map((r) => r.key.split(":")[0])).toEqual(["b"]);
  });

  test("events without a reminder are ignored", () => {
    expect(upcomingReminders([item("a", 60, null)], NOW, HORIZON)).toEqual([]);
  });

  test("the horizon limits how far ahead it looks (inclusive)", () => {
    expect(upcomingReminders([item("a", 100, 10)], NOW, 90 * MIN)).toHaveLength(1); // fires in exactly 90 min
    expect(upcomingReminders([item("a", 101, 10)], NOW, 90 * MIN)).toHaveLength(0);
  });

  test("a one-day reminder fires 24 hours before the start", () => {
    const [r] = upcomingReminders([item("a", 25 * 60, 1440)], NOW, HORIZON);
    expect(r.fireAt.toISOString()).toBe(at(60).toISOString());
  });

  test("results are sorted by fire time", () => {
    const out = upcomingReminders([item("late", 300, 5), item("soon", 20, 5), item("mid", 120, 5)], NOW, HORIZON);
    expect(out.map((r) => r.key.split(":")[0])).toEqual(["soon", "mid", "late"]);
  });

  test("two occurrences of one series get different keys", () => {
    const out = upcomingReminders([item("s", 60, 5), { ...item("s", 0, 5), startsAt: at(1500) }], NOW, HORIZON);
    expect(new Set(out.map((r) => r.key)).size).toBe(2);
  });
});
