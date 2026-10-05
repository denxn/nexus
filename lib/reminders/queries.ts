import { prisma } from "@/lib/db";
import { eventRuleOf, expandEvent } from "@/lib/recurrence/events";
import { addDays, dayKey } from "@/lib/time";
import { upcomingReminders } from "./due";
import type { ReminderTask } from "./schedule";

const HORIZON_MS = 48 * 60 * 60 * 1000;
const LOOKAHEAD_MS = HORIZON_MS + 24 * 60 * 60 * 1000; // a one-day reminder belongs to an event up to 3 days away

/** Reminders to fire in the next 48 hours, recurring events expanded, as plain numbers for the client. */
export async function getUpcomingReminders(now: Date = new Date()): Promise<ReminderTask[]> {
  const today = dayKey(now);
  const until = new Date(now.getTime() + LOOKAHEAD_MS);

  const [oneOffs, series] = await Promise.all([
    prisma.event.findMany({
      where: { repeat: "NONE", remindMinutes: { not: null }, startsAt: { gte: now, lte: until } },
    }),
    prisma.event.findMany({
      where: {
        repeat: { not: "NONE" },
        remindMinutes: { not: null },
        startsAt: { lte: until },
        OR: [{ repeatUntil: null }, { repeatUntil: { gte: today } }],
      },
    }),
  ]);

  const items = [
    ...oneOffs.map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt, remindMinutes: e.remindMinutes })),
    ...series.flatMap((row) =>
      expandEvent(eventRuleOf(row), today, addDays(today, 3)).map((o) => ({
        id: row.id,
        title: row.title,
        startsAt: o.startsAt,
        remindMinutes: row.remindMinutes,
      })),
    ),
  ];
  return upcomingReminders(items, now, HORIZON_MS).map((r) => ({
    key: r.key,
    title: r.title,
    fireAt: r.fireAt.getTime(),
    startsAt: r.startsAt.getTime(),
  }));
}
