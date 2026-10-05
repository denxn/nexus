import { parseDay } from "@/lib/time";

type Param = string | string[] | undefined;
const first = (v: Param) => (Array.isArray(v) ? v[0] : v);
const MAX_QUERY = 100;

/** Parses the /notes URL; every invalid value falls back to its default. */
export function parseNotesParams(p: { q?: Param; day?: Param; page?: Param }): {
  q: string | null;
  day: string | null;
  page: number;
} {
  const q = (first(p.q) ?? "").trim().slice(0, MAX_QUERY).trim();
  const rawPage = first(p.page) ?? "";
  return {
    q: q === "" ? null : q,
    day: parseDay(p.day),
    page: /^\d+$/.test(rawPage) && Number(rawPage) >= 1 ? Number(rawPage) : 1,
  };
}
