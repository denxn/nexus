import { dayKey, romeLocalToDate, toRomeLocalInput } from "@/lib/time";
import { expandOccurrences, type Rule } from "./rule";

export type EventRule = { startsAt: Date; endsAt: Date | null; skippedDays: string[] } & Rule;

/**
 * Occurrence instants of an event inside [fromDay, toDay] (Rome days). Every occurrence keeps the
 * series' Rome wall-clock start and end, so daylight saving never shifts an event.
 */
export function expandEvent(
  ev: EventRule,
  fromDay: string,
  toDay: string,
): { day: string; startsAt: Date; endsAt: Date | null }[] {
  const anchor = dayKey(ev.startsAt);
  const startClock = toRomeLocalInput(ev.startsAt).slice(11);
  const endClock = ev.endsAt ? toRomeLocalInput(ev.endsAt).slice(11) : null;
  return expandOccurrences(ev, anchor, fromDay, toDay, ev.skippedDays).map((day) => ({
    day,
    startsAt: romeLocalToDate(`${day}T${startClock}`),
    endsAt: endClock ? romeLocalToDate(`${day}T${endClock}`) : null,
  }));
}

type EventRow = {
  startsAt: Date;
  endsAt: Date | null;
  skippedDays: string[];
  repeat: Rule["repeat"];
  repeatInterval: number;
  repeatWeekdays: number[];
  repeatUntil: string | null;
};

/** The recurrence rule of a stored event row (events anchor on their start day, so monthDay is not needed). */
export const eventRuleOf = (row: EventRow): EventRule => ({
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  skippedDays: row.skippedDays,
  repeat: row.repeat,
  interval: row.repeatInterval,
  weekdays: row.repeatWeekdays,
  until: row.repeatUntil,
  monthDay: null,
});
