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
