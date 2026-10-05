import { prisma } from "@/lib/db";

const KEEP_MS = 24 * 60 * 60 * 1000;

/** Every recorded attempt inside the window (with ids, so a caller can set its own aside). */
export async function recentFailures(
  windowMinutes: number,
  now: Date = new Date(),
): Promise<{ id: string; ip: string; at: Date }[]> {
  return prisma.loginAttempt.findMany({
    where: { at: { gt: new Date(now.getTime() - windowMinutes * 60_000) } },
    select: { id: true, ip: true, at: true },
  });
}

/** Records an attempt (committed before it returns), prunes rows older than a day, and returns the new id. */
export async function insertAttempt(ip: string, now: Date = new Date()): Promise<string> {
  const { id } = await prisma.loginAttempt.create({ data: { ip, at: now }, select: { id: true } });
  await prisma.loginAttempt.deleteMany({ where: { at: { lt: new Date(now.getTime() - KEEP_MS) } } }).catch(() => {});
  return id;
}

export async function deleteAttempt(id: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { id } });
}

export async function clearFailures(ip: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { ip } });
}
