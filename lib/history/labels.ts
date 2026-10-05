export type LabelRow = { key: string; display: string; count: number; total: number };

/**
 * Groups entries by label, ignoring case and surrounding spaces. Empty labels are skipped.
 * `display` is the most frequent trimmed spelling (ties go to the first seen). Sorted by
 * total, then count (both descending), then key.
 */
export function labelBreakdown(entries: { label: string | null; value: number }[], limit: number): LabelRow[] {
  const groups = new Map<string, { spellings: Map<string, number>; count: number; total: number }>();
  for (const e of entries) {
    const trimmed = e.label?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    const g = groups.get(key) ?? { spellings: new Map(), count: 0, total: 0 };
    g.spellings.set(trimmed, (g.spellings.get(trimmed) ?? 0) + 1);
    g.count += 1;
    g.total += e.value;
    groups.set(key, g);
  }
  return [...groups.entries()]
    .map(([key, g]) => {
      let display = "";
      let best = 0;
      for (const [spelling, n] of g.spellings) {
        if (n > best) {
          best = n;
          display = spelling;
        }
      }
      return { key, display, count: g.count, total: g.total };
    })
    .sort((a, b) => b.total - a.total || b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .slice(0, limit);
}
