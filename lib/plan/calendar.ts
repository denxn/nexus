import { formatEntryValue } from "@/lib/format";
import type { EntryLike } from "@/lib/stats";
import { dayKey } from "@/lib/time";

export type DayMarkers = { event: boolean; todo: boolean; logged: boolean };

/** Which of the given Rome days have an event, an open todo due, or any logged entry. */
export function buildMarkers(
  days: string[],
  events: { startsAt: Date }[],
  todos: { dueDate: string | null; done: boolean }[],
  entries: { occurredAt: Date }[],
): Record<string, DayMarkers> {
  const markers: Record<string, DayMarkers> = Object.fromEntries(
    days.map((d) => [d, { event: false, todo: false, logged: false }]),
  );
  for (const e of events) {
    const m = markers[dayKey(e.startsAt)];
    if (m) m.event = true;
  }
  for (const t of todos) {
    if (!t.done && t.dueDate && markers[t.dueDate]) markers[t.dueDate].todo = true;
  }
  for (const e of entries) {
    const m = markers[dayKey(e.occurredAt)];
    if (m) m.logged = true;
  }
  return markers;
}

const ORDER = [
  ["WORKOUT", "Workout"],
  ["STUDY", "Study"],
  ["SLEEP", "Sleep"],
  ["MEAL", "Calories"],
  ["MOOD", "Mood"],
] as const;

/** One line per type logged on the given Rome day: totals, or the average for mood. */
export function summarizeDay(
  day: string,
  entries: EntryLike[],
): { type: EntryLike["type"]; text: string }[] {
  const onDay = entries.filter((e) => dayKey(e.occurredAt) === day);
  return ORDER.flatMap(([type, name]) => {
    const rows = onDay.filter((e) => e.type === type);
    if (rows.length === 0) return [];
    const total = rows.reduce((s, e) => s + e.value, 0);
    const value = type === "MOOD" ? Math.round((total / rows.length) * 10) / 10 : total;
    return [{ type, text: `${name} ${formatEntryValue(type, value)}` }];
  });
}
