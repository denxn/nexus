/** "0,2,4" -> [0, 2, 4] (0 = Monday). Blank entries and anything outside 0 to 6 are dropped; sorted, no duplicates. */
export function parseWeekdayList(csv: string | undefined): number[] {
  if (!csv) return [];
  const days = csv
    .split(",")
    .map((t) => t.trim())
    .filter((t) => /^\d$/.test(t))
    .map(Number)
    .filter((n) => n >= 0 && n <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}
