import { prisma } from "@/lib/db";

const KEEP_MS = 24 * 60 * 60 * 1000;

/** Failed logins from every IP inside the window. */
export async function recentFailures(
  windowMinutes: number,
  now: Date = new Date(),
): Promise<{ ip: string; at: Date }[]> {
  return prisma.loginAttempt.findMany({
    where: { at: { gt: new Date(now.getTime() - windowMinutes * 60_000) } },
    select: { ip: true, at: true },
  });
}

/** Stores a failure and prunes rows older than a day. */
export async function recordFailure(ip: string, now: Date = new Date()): Promise<void> {
  await prisma.loginAttempt.create({ data: { ip, at: now } });
  await prisma.loginAttempt.deleteMany({ where: { at: { lt: new Date(now.getTime() - KEEP_MS) } } });
}

export async function clearFailures(ip: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { ip } });
}
