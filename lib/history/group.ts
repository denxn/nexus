import { dayKey } from "@/lib/time";

/** Entries grouped by Rome day: newest day first, newest entry first inside a day, with each day's value total. */
export function groupByDay<T extends { occurredAt: Date; value: number }>(
  entries: T[],
): { day: string; total: number; entries: T[] }[] {
  const byDay = new Map<string, T[]>();
  for (const e of entries) {
    const day = dayKey(e.occurredAt);
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([day, list]) => ({
      day,
      total: list.reduce((sum, e) => sum + e.value, 0),
      entries: [...list].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()),
    }));
}
