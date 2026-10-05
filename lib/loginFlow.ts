import { evaluateLockout, type Limits } from "./loginLockout";

export type LoginDeps = {
  /** Records an attempt and returns its id. Must be committed before it resolves. */
  insertAttempt(ip: string): Promise<string>;
  /** Every recorded attempt inside the window, with ids. */
  recentFailures(windowMinutes: number): Promise<{ id: string; ip: string; at: Date }[]>;
  deleteAttempt(id: string): Promise<void>;
  clearFailures(ip: string): Promise<void>;
  checkPassword(password: string): boolean;
  sleep(ms: number): Promise<void>;
  now(): Date;
};

export type LoginOutcome =
  | { kind: "success" }
  | { kind: "wrong" }
  | { kind: "locked"; minutes: number }
  | { kind: "unavailable" };

const FAILURE_DELAY_MS = 500;

async function quietly(work: Promise<unknown>) {
  try {
    await work;
  } catch {
    // Best-effort housekeeping; the outcome does not depend on it.
  }
}

/**
 * One login attempt. The attempt is recorded BEFORE the password is looked at, and the lock is
 * decided from everyone else's recorded attempts. Parallel guesses therefore see each other:
 * by commit order, only the first `perIp` (or `global`) attempts can ever reach the password check.
 *
 * - Locked: the attempt's own record is removed (refused attempts are not stored) and the
 *   password is never compared, so even the correct one is refused.
 * - Anything unexpected while recording or checking refuses the login (fails closed).
 * - Wrong password: the record stays (it is the failure) and the answer waits ~500 ms.
 * - Correct password: all of this IP's records are cleared.
 */
export async function runLoginAttempt(
  deps: LoginDeps,
  input: { ip: string; password: string; limits: Limits },
): Promise<LoginOutcome> {
  const { ip, password, limits } = input;

  let id: string;
  try {
    id = await deps.insertAttempt(ip);
  } catch {
    return { kind: "unavailable" };
  }

  try {
    const others = (await deps.recentFailures(limits.windowMinutes)).filter((f) => f.id !== id);
    const lock = evaluateLockout(others, ip, deps.now(), limits);
    if (lock.locked) {
      await quietly(deps.deleteAttempt(id));
      return { kind: "locked", minutes: lock.retryAfterMinutes };
    }
  } catch {
    await quietly(deps.deleteAttempt(id));
    return { kind: "unavailable" };
  }

  if (!deps.checkPassword(password)) {
    await deps.sleep(FAILURE_DELAY_MS);
    return { kind: "wrong" };
  }

  await quietly(deps.clearFailures(ip));
  return { kind: "success" };
}
