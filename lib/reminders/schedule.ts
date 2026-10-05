export type ReminderTask = { key: string; title: string; fireAt: number; startsAt: number };

/**
 * Splits reminders into those to show now and those to schedule. A reminder is skipped when it was
 * already shown (`reminded`) or when its event has already started. Times are epoch milliseconds.
 */
export function planReminders(
  tasks: ReminderTask[],
  nowMs: number,
  reminded: Set<string>,
): { fireNow: ReminderTask[]; later: (ReminderTask & { delayMs: number })[] } {
  const fireNow: ReminderTask[] = [];
  const later: (ReminderTask & { delayMs: number })[] = [];
  for (const t of tasks) {
    if (reminded.has(t.key) || t.startsAt < nowMs) continue;
    if (t.fireAt <= nowMs) fireNow.push(t);
    else later.push({ ...t, delayMs: t.fireAt - nowMs });
  }
  return { fireNow, later };
}

/** Forgets reminded keys older than `maxAgeMs`, so the stored list cannot grow forever. */
export function pruneReminded(
  entries: { key: string; at: number }[],
  nowMs: number,
  maxAgeMs: number,
): { key: string; at: number }[] {
  return entries.filter((e) => Number.isFinite(e.at) && nowMs - e.at <= maxAgeMs);
}
