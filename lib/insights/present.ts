export type ChangeTone = "up" | "down" | "flat" | "new" | "none";

/** How a period-over-period change is shown: "+12%", "-5%", "new" (no earlier data) or a dash. */
export function formatChange(change: number | null, current: number): { text: string; tone: ChangeTone } {
  if (change === null) return current > 0 ? { text: "new", tone: "new" } : { text: "–", tone: "none" };
  if (change > 0) return { text: `+${change}%`, tone: "up" };
  if (change < 0) return { text: `${change}%`, tone: "down" };
  return { text: "0%", tone: "flat" };
}

type Params = Record<string, string | string[] | undefined>;

/** `base` plus the current search params with `overrides` applied; empty values are dropped. */
export function withParams(base: string, current: Params, overrides: Record<string, string>): string {
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(current)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) merged[key] = first;
  }
  Object.assign(merged, overrides);
  const query = new URLSearchParams(merged).toString();
  return query ? `${base}?${query}` : base;
}
