/** Notes grouped by their day: newest day first, newest created first inside a day (stable on ties). */
export function groupNotesByDay<T extends { day: string; createdAt: Date }>(
  notes: T[],
): { day: string; notes: T[] }[] {
  const byDay = new Map<string, T[]>();
  for (const n of notes) byDay.set(n.day, [...(byDay.get(n.day) ?? []), n]);
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([day, list]) => ({
      day,
      notes: list
        .map((n, index) => ({ n, index }))
        .sort((a, b) => b.n.createdAt.getTime() - a.n.createdAt.getTime() || a.index - b.index)
        .map(({ n }) => n),
    }));
}
