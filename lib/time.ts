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
