export const TZ = "Europe/Rome";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" of the given instant in Europe/Rome. */
export function dayKey(d: Date): string {
  const parts = Object.fromEntries(
    formatter.formatToParts(d).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const wallFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function wallParts(d: Date) {
  return Object.fromEntries(
    wallFormatter.formatToParts(d).map((p) => [p.type, Number(p.value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute", number>;
}

/** Rome's UTC offset in milliseconds at the given instant. */
function romeOffsetMs(d: Date): number {
  const p = wallParts(d);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(d.getTime() / 60000) * 60000;
}

/** An instant formatted as Rome wall time for a datetime-local input: "YYYY-MM-DDTHH:mm". */
export function toRomeLocalInput(d: Date): string {
  const p = wallParts(d);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${two(p.month)}-${two(p.day)}T${two(p.hour)}:${two(p.minute)}`;
}

/** Reads "YYYY-MM-DDTHH:mm" as Rome wall time, whatever the server's own timezone is. */
export function romeLocalToDate(local: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return new Date(NaN);
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = guess - romeOffsetMs(new Date(guess));
  return new Date(guess - romeOffsetMs(new Date(first)));
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, n: number): string {
  const date = parseKey(key);
  date.setUTCDate(date.getUTCDate() + n);
  return toKey(date);
}

/** Monday of the week containing `key`. */
export function weekStartKey(key: string): string {
  const dow = parseKey(key).getUTCDay(); // 0 = Sunday
  return addDays(key, -((dow + 6) % 7));
}

/** `days` keys, oldest to newest, ending at `endKey`. */
export function rangeKeys(endKey: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(endKey, i - (days - 1)));
}

// Years outside this range overflow date math (year 10000, two-digit years).
const MIN_YEAR = 1970;
const MAX_YEAR = 2100;
const yearInRange = (y: number) => y >= MIN_YEAR && y <= MAX_YEAR;

/** True only for a real calendar date written as "YYYY-MM-DD" with a year from 1970 to 2100. */
export function isDayKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  if (!yearInRange(Number(s.slice(0, 4)))) return false;
  return toKey(parseKey(s)) === s;
}

/** "2026-10-04" -> "2026-10". */
export function monthKeyOf(day: string): string {
  return day.slice(0, 7);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + n;
  const year = Math.floor(index / 12);
  return `${year}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Monday-first weeks covering the month; cells outside the month have inMonth false. */
export function monthMatrix(month: string): { day: string; inMonth: boolean }[][] {
  const first = `${month}-01`;
  const next = `${addMonths(month, 1)}-01`;
  const lastDay = addDays(next, -1);
  const start = weekStartKey(first);
  const weeks: { day: string; inMonth: boolean }[][] = [];
  for (let cursor = start; cursor <= lastDay; cursor = addDays(cursor, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(cursor, i);
        return { day, inMonth: monthKeyOf(day) === month };
      }),
    );
  }
  return weeks;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Valid "YYYY-MM" from a search param, else the current Rome month. */
export function parseMonth(v: string | string[] | undefined): string {
  const raw = first(v);
  return raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) && yearInRange(Number(raw.slice(0, 4)))
    ? raw
    : monthKeyOf(dayKey(new Date()));
}

/** A real day key from a search param, else null. */
export function parseDay(v: string | string[] | undefined): string | null {
  const raw = first(v);
  return raw && isDayKey(raw) ? raw : null;
}

/** Whole days from `a` to `b` (negative when b is earlier), both "YYYY-MM-DD". */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000);
}

/** Minutes since midnight on the Rome wall clock (0 to 1439). */
export function romeMinutesOfDay(d: Date): number {
  const p = wallParts(d);
  return p.hour * 60 + p.minute;
}

/** 402 -> "06:42". Fractions are rounded. */
export function formatClock(minutes: number): string {
  const total = Math.round(minutes) % 1440;
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(Math.floor(total / 60))}:${two(total % 60)}`;
}
