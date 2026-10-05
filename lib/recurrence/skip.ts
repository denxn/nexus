import { prisma } from "@/lib/db";

/**
 * Hides one day of a recurring event. Reads then sets the list (rather than filtering on it in SQL)
 * because the column can be NULL on older rows, and `NOT (NULL has day)` matches nothing.
 * Returns false when the event does not exist or does not repeat.
 */
export async function addSkippedDay(eventId: string, day: string): Promise<boolean> {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { repeat: true, skippedDays: true } });
  if (!event || event.repeat === "NONE") return false;
  const days = new Set(event.skippedDays ?? []);
  if (days.has(day)) return true;
  days.add(day);
  await prisma.event.update({ where: { id: eventId }, data: { skippedDays: { set: [...days].sort() } } });
  return true;
}
