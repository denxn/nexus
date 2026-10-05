export type HistoryRange = 7 | 30 | 90 | 365 | "all";
const RANGES: readonly string[] = ["7", "30", "90", "365", "all"];
const MAX_LABEL = 80;

type Param = string | string[] | undefined;
const first = (v: Param) => (Array.isArray(v) ? v[0] : v);

/** Parses the history page URL; every invalid value falls back to its default. */
export function parseHistoryParams(p: { range?: Param; label?: Param; page?: Param }): {
  range: HistoryRange;
  label: string | null;
  page: number;
} {
  const rawRange = first(p.range) ?? "";
  const range: HistoryRange = RANGES.includes(rawRange)
    ? rawRange === "all"
      ? "all"
      : (Number(rawRange) as 7 | 30 | 90 | 365)
    : 30;

  const label = (first(p.label) ?? "").trim().slice(0, MAX_LABEL).trim();

  const rawPage = first(p.page) ?? "";
  const page = /^\d+$/.test(rawPage) && Number(rawPage) >= 1 ? Number(rawPage) : 1;

  return { range, label: label === "" ? null : label, page };
}
