import { addDays, addMonths, daysBetween, monthKeyOf, weekStartKey } from "@/lib/time";

export type Rule = {
  repeat: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  interval: number; // 1 to 99
  weekdays: number[]; // 0 = Monday .. 6 = Sunday; WEEKLY only, empty means the anchor's weekday
  until: string | null; // inclusive day key
  monthDay: number | null; // MONTHLY: intended day of month (otherwise the anchor's day)
};

const SEARCH_DAYS = 3700;

/** 0 = Monday .. 6 = Sunday. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

function lastDayOfMonth(month: string): number {
  return Number(addDays(`${addMonths(month, 1)}-01`, -1).slice(8));
}

/**
 * The month day a monthly to-do should remember after its due date is saved: the stored one when the
 * due date is just that day clamped to a short month (31 shown as 28 Feb), otherwise the due date's own day.
 */
export function keepMonthDay(stored: number | null, due: string): number {
  const dueDay = Number(due.slice(8));
  if (stored !== null && stored > dueDay && dueDay === Math.min(stored, lastDayOfMonth(due.slice(0, 7)))) return stored;
  return dueDay;
}

/**
 * Occurrence day keys of a rule inside [from, to], ascending. Never before the anchor, never after
 * `until`, skipped days removed.
 */
export function expandOccurrences(rule: Rule, anchor: string, from: string, to: string, skipped: string[] = []): string[] {
  const start = from > anchor ? from : anchor;
  const end = rule.until && rule.until < to ? rule.until : to;
  if (start > end) return [];
  const skip = new Set(skipped);
  const out: string[] = [];
  const push = (d: string) => {
    if (d >= start && d <= end && !skip.has(d)) out.push(d);
  };
  const n = Math.max(1, rule.interval);

  switch (rule.repeat) {
    case "NONE":
      push(anchor);
      break;
    case "DAILY": {
      const offset = daysBetween(anchor, start) % n;
      for (let d = offset === 0 ? start : addDays(start, n - offset); d <= end; d = addDays(d, n)) push(d);
      break;
    }
    case "WEEKLY": {
      const weekdays = rule.weekdays.length ? rule.weekdays : [weekdayOf(anchor)];
      const anchorWeek = weekStartKey(anchor);
      for (let d = start; d <= end; d = addDays(d, 1)) {
        if (!weekdays.includes(weekdayOf(d))) continue;
        if (daysBetween(anchorWeek, weekStartKey(d)) / 7 % n === 0) push(d);
      }
      break;
    }
    case "MONTHLY": {
      const dayOfMonth = rule.monthDay ?? Number(anchor.slice(8));
      const lastMonth = monthKeyOf(end);
      for (let m = monthKeyOf(anchor); m <= lastMonth; m = addMonths(m, n)) {
        push(`${m}-${String(Math.min(dayOfMonth, lastDayOfMonth(m))).padStart(2, "0")}`);
      }
      break;
    }
  }
  return out;
}

/** The first occurrence strictly after `after` (searching up to about ten years ahead), or null. */
export function nextOccurrence(rule: Rule, anchor: string, after: string, skipped: string[] = []): string | null {
  const limit = addDays(after, SEARCH_DAYS);
  const end = rule.until && rule.until < limit ? rule.until : limit;
  return expandOccurrences(rule, anchor, addDays(after, 1), end, skipped)[0] ?? null;
}
