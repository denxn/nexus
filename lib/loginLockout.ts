export type Limits = { perIp: number; global: number; windowMinutes: number };

const DEFAULTS: Limits = { perIp: 5, global: 20, windowMinutes: 15 };

const positiveInt = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return value !== undefined && value.trim() !== "" && Number.isInteger(n) && n > 0 ? n : fallback;
};

export function parseLimits(env: Record<string, string | undefined>): Limits {
  return {
    perIp: positiveInt(env.LOGIN_MAX_ATTEMPTS, DEFAULTS.perIp),
    global: positiveInt(env.LOGIN_GLOBAL_MAX, DEFAULTS.global),
    windowMinutes: positiveInt(env.LOGIN_WINDOW_MINUTES, DEFAULTS.windowMinutes),
  };
}

/** Behind Vercel's proxy the first x-forwarded-for entry is the client. */
export function clientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return headers.get("x-real-ip")?.trim() || "unknown";
}

type Failure = { ip: string; at: Date };

/** When the lock caused by `limit` failures among `failures` (newest first) ends, in ms since epoch. */
const unlockAt = (newestFirst: Failure[], limit: number, windowMs: number): number | null =>
  newestFirst.length >= limit ? newestFirst[limit - 1].at.getTime() + windowMs : null;

/**
 * A failure counts while it is newer than the window. Locked per IP at `perIp` failures and for
 * everyone at `global` failures; a lock ends when the failure that tips it over leaves the window.
 */
export function evaluateLockout(
  failures: Failure[],
  ip: string,
  now: Date,
  limits: Limits,
): { locked: false } | { locked: true; retryAfterMinutes: number } {
  const windowMs = limits.windowMinutes * 60_000;
  const counting = failures
    .filter((f) => f.at.getTime() > now.getTime() - windowMs)
    .sort((a, b) => b.at.getTime() - a.at.getTime());

  const ends = [
    unlockAt(counting.filter((f) => f.ip === ip), limits.perIp, windowMs),
    unlockAt(counting, limits.global, windowMs),
  ].filter((t): t is number => t !== null);

  if (ends.length === 0) return { locked: false };
  const msLeft = Math.max(...ends) - now.getTime();
  return { locked: true, retryAfterMinutes: Math.max(1, Math.ceil(msLeft / 60_000)) };
}
