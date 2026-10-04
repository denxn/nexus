export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const DEFAULT_RANGE: Range = 30;

/** Parses the `?range=` search param; anything unsupported falls back to 30. */
export function parseRange(value: string | string[] | undefined): Range {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : DEFAULT_RANGE;
}
