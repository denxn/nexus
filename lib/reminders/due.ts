export type ReminderItem = { id: string; title: string; startsAt: Date; remindMinutes: number | null };

const LATE_GRACE_MS = 60_000;

/**
 * Reminders that should fire between 60 seconds ago and `horizonMs` from now, for events that have not
 * started yet. The key identifies one occurrence (event id plus start instant) so it fires only once.
 */
export function upcomingReminders(
  items: ReminderItem[],
  now: Date,
  horizonMs: number,
): { key: string; title: string; fireAt: Date; startsAt: Date }[] {
  const t = now.getTime();
  return items
    .filter((i) => i.remindMinutes !== null && i.startsAt.getTime() >= t)
    .map((i) => ({
      key: `${i.id}:${i.startsAt.toISOString()}`,
      title: i.title,
      fireAt: new Date(i.startsAt.getTime() - (i.remindMinutes as number) * 60_000),
      startsAt: i.startsAt,
    }))
    .filter((r) => r.fireAt.getTime() >= t - LATE_GRACE_MS && r.fireAt.getTime() <= t + horizonMs)
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
