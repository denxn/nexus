import { describe, expect, test } from "vitest";
import { clientIp, evaluateLockout, lockoutMessage, parseLimits, type Limits } from "./loginLockout";

const LIMITS: Limits = { perIp: 5, global: 20, windowMinutes: 15 };
const NOW = new Date("2026-10-05T12:00:00Z");
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);
const fails = (ip: string, secondsAgo: number[]) => secondsAgo.map((s) => ({ ip, at: ago(s) }));

describe("evaluateLockout (per IP)", () => {
  test("4 failures are not locked, 5 and 6 are", () => {
    expect(evaluateLockout(fails("a", [10, 20, 30, 40]), "a", NOW, LIMITS)).toEqual({ locked: false });
    expect(evaluateLockout(fails("a", [10, 20, 30, 40, 50]), "a", NOW, LIMITS).locked).toBe(true);
    expect(evaluateLockout(fails("a", [10, 20, 30, 40, 50, 60]), "a", NOW, LIMITS).locked).toBe(true);
  });

  test("a failure exactly one window old no longer counts; one second younger still does", () => {
    const window = 15 * 60;
    expect(evaluateLockout(fails("a", [10, 20, 30, 40, window]), "a", NOW, LIMITS).locked).toBe(false);
    expect(evaluateLockout(fails("a", [10, 20, 30, 40, window - 1]), "a", NOW, LIMITS).locked).toBe(true);
  });

  test("another IP is not locked by someone else's failures", () => {
    const f = fails("a", [10, 20, 30, 40, 50]);
    expect(evaluateLockout(f, "b", NOW, LIMITS)).toEqual({ locked: false });
  });

  test("no failures is not locked", () => {
    expect(evaluateLockout([], "a", NOW, LIMITS)).toEqual({ locked: false });
  });
});

describe("evaluateLockout (global)", () => {
  test("19 failures spread over IPs do not lock, 20 lock even an IP with no failures", () => {
    const spread = (n: number) => Array.from({ length: n }, (_, i) => ({ ip: `ip${i % 7}`, at: ago(10 + i) }));
    expect(evaluateLockout(spread(19), "fresh", NOW, LIMITS).locked).toBe(false);
    expect(evaluateLockout(spread(20), "fresh", NOW, LIMITS).locked).toBe(true);
  });
});

describe("retry minutes", () => {
  const lockedMinutes = (secondsAgo: number[]) => {
    const r = evaluateLockout(fails("a", secondsAgo), "a", NOW, LIMITS);
    return r.locked ? r.retryAfterMinutes : null;
  };

  test("rounds up: ending in 14m30s gives 15", () => {
    const window = 15 * 60;
    // the 5th most recent failure is 30s old, so the lock ends at 15m - 30s = 14m30s from now
    expect(lockedMinutes([1, 2, 3, 4, 30])).toBe(15);
    expect(window).toBe(900);
  });

  test("never below 1: ending in one second gives 1", () => {
    expect(lockedMinutes([1, 2, 3, 4, 15 * 60 - 1])).toBe(1);
  });

  test("with more than 5 failures the 5th most recent decides, not the oldest", () => {
    // desc: 2m, 4m, 6m, 8m, 10m (5th), 12m, 14m -> unlocks 15m after the 10m-old failure = 5 minutes from now
    expect(lockedMinutes([120, 240, 360, 480, 600, 720, 840])).toBe(5);
  });

  test("the global lock reports its own unlock time", () => {
    const f = Array.from({ length: 20 }, (_, i) => ({ ip: `ip${i}`, at: ago(60 * (i % 10) + 30) }));
    const r = evaluateLockout(f, "fresh", NOW, LIMITS);
    expect(r.locked).toBe(true);
    if (r.locked) expect(r.retryAfterMinutes).toBeGreaterThanOrEqual(1);
  });

  test("when both locks apply the later unlock wins", () => {
    // Per-IP: the 5th most recent of "a" is 14 minutes old, so that lock alone would end in 1 minute.
    // Global: 21 failures in total; the 20th most recent is 75 seconds old, so that lock ends in 13m45s -> 14.
    const mine = fails("a", [10, 20, 30, 40, 14 * 60]);
    const others = Array.from({ length: 16 }, (_, i) => ({ ip: `x${i}`, at: ago(60 + i) }));
    const r = evaluateLockout([...mine, ...others], "a", NOW, LIMITS);
    expect(r).toEqual({ locked: true, retryAfterMinutes: 14 });
  });

  test("custom window and limits are honoured", () => {
    const limits: Limits = { perIp: 3, global: 10, windowMinutes: 5 };
    const r = evaluateLockout(fails("a", [10, 20, 30]), "a", NOW, limits);
    expect(r.locked).toBe(true);
    expect(evaluateLockout(fails("a", [10, 20, 5 * 60]), "a", NOW, limits).locked).toBe(false);
  });
});

describe("parseLimits", () => {
  test("defaults", () => {
    expect(parseLimits({})).toEqual({ perIp: 5, global: 20, windowMinutes: 15 });
  });

  test("valid overrides", () => {
    expect(parseLimits({ LOGIN_MAX_ATTEMPTS: "3", LOGIN_GLOBAL_MAX: "9", LOGIN_WINDOW_MINUTES: "30" })).toEqual({
      perIp: 3,
      global: 9,
      windowMinutes: 30,
    });
  });

  test("invalid, zero, negative, fractional and empty values fall back per field", () => {
    for (const bad of ["0", "-2", "abc", "", "3.5", " "]) {
      expect(parseLimits({ LOGIN_MAX_ATTEMPTS: bad }).perIp).toBe(5);
    }
    expect(parseLimits({ LOGIN_MAX_ATTEMPTS: "2", LOGIN_GLOBAL_MAX: "nope" })).toEqual({ perIp: 2, global: 20, windowMinutes: 15 });
  });
});

describe("clientIp", () => {
  const headers = (h: Record<string, string>) => ({ get: (name: string) => h[name.toLowerCase()] ?? null });

  test("uses the first x-forwarded-for entry, trimmed", () => {
    expect(clientIp(headers({ "x-forwarded-for": " 1.2.3.4 , 10.0.0.1" }))).toBe("1.2.3.4");
  });

  test("falls back to x-real-ip, then unknown", () => {
    expect(clientIp(headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(headers({}))).toBe("unknown");
    expect(clientIp(headers({ "x-forwarded-for": "  " }))).toBe("unknown");
  });
});

describe("lockoutMessage", () => {
  test("singular and plural minutes", () => {
    expect(lockoutMessage(1)).toBe("Too many attempts. Try again in 1 minute.");
    expect(lockoutMessage(15)).toBe("Too many attempts. Try again in 15 minutes.");
  });
});
