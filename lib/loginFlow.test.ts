import { describe, expect, test } from "vitest";
import { runLoginAttempt, type LoginDeps } from "./loginFlow";
import type { Limits } from "./loginLockout";

const LIMITS: Limits = { perIp: 5, global: 20, windowMinutes: 15 };
const NOW = new Date("2026-10-05T12:00:00Z");

type Row = { id: string; ip: string; at: Date };

/** In-memory store. `jitter` makes every call yield for a different number of milliseconds so concurrent attempts interleave. */
function fakeStore(opts: { password?: string; jitter?: boolean } = {}) {
  const rows: Row[] = [];
  let nextId = 1;
  let calls = 0;
  const log = { passwordChecks: 0, sleeps: [] as number[], failInsert: false, failList: false };
  const tick = () => (opts.jitter ? new Promise<void>((r) => setTimeout(r, (calls++ * 3) % 5)) : Promise.resolve());

  const deps: LoginDeps = {
    async insertAttempt(ip) {
      await tick();
      if (log.failInsert) throw new Error("insert failed");
      const id = String(nextId++);
      rows.push({ id, ip, at: NOW });
      return id;
    },
    async recentFailures() {
      await tick();
      if (log.failList) throw new Error("list failed");
      return rows.map((r) => ({ ...r }));
    },
    async deleteAttempt(id) {
      await tick();
      const i = rows.findIndex((r) => r.id === id);
      if (i >= 0) rows.splice(i, 1);
    },
    async clearFailures(ip) {
      await tick();
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i].ip === ip) rows.splice(i, 1);
    },
    checkPassword(pw) {
      log.passwordChecks += 1;
      return pw === (opts.password ?? "right");
    },
    sleep: async (ms) => void log.sleeps.push(ms),
    now: () => NOW,
  };
  return { rows, log, deps };
}
const attempt = (deps: LoginDeps, password: string, ip = "1.1.1.1") => runLoginAttempt(deps, { ip, password, limits: LIMITS });

describe("runLoginAttempt: sequential behaviour", () => {
  test("five wrong passwords are 'wrong'; the sixth is locked even with the correct password and is not recorded", async () => {
    const { deps, rows, log } = fakeStore();
    for (let i = 0; i < 5; i++) expect((await attempt(deps, "nope")).kind).toBe("wrong");
    expect(rows).toHaveLength(5);
    const sixth = await attempt(deps, "right");
    expect(sixth.kind).toBe("locked");
    expect(rows).toHaveLength(5);
    expect(log.passwordChecks).toBe(5); // the correct password was never even compared
  });

  test("the lock outcome carries the minutes left", async () => {
    const { deps } = fakeStore();
    for (let i = 0; i < 5; i++) await attempt(deps, "nope");
    const r = await attempt(deps, "nope");
    expect(r).toEqual({ kind: "locked", minutes: 15 });
  });

  test("a correct password before the limit succeeds and clears that IP's rows only", async () => {
    const { deps, rows } = fakeStore();
    for (let i = 0; i < 3; i++) await attempt(deps, "nope", "1.1.1.1");
    await attempt(deps, "nope", "2.2.2.2");
    expect((await attempt(deps, "right", "1.1.1.1")).kind).toBe("success");
    expect(rows.map((r) => r.ip)).toEqual(["2.2.2.2"]);
  });

  test("the fifth attempt can still succeed (four failures so far)", async () => {
    const { deps } = fakeStore();
    for (let i = 0; i < 4; i++) await attempt(deps, "nope");
    expect((await attempt(deps, "right")).kind).toBe("success");
  });

  test("a wrong password waits 500 ms before answering", async () => {
    const { deps, log } = fakeStore();
    await attempt(deps, "nope");
    expect(log.sleeps).toEqual([500]);
  });

  test("another IP is unaffected by someone else's lockout", async () => {
    const { deps } = fakeStore();
    for (let i = 0; i < 6; i++) await attempt(deps, "nope", "1.1.1.1");
    expect((await attempt(deps, "right", "9.9.9.9")).kind).toBe("success");
  });
});

describe("runLoginAttempt: fails closed", () => {
  test("if the attempt cannot be recorded the login is refused and the password is never compared", async () => {
    const { deps, log } = fakeStore();
    log.failInsert = true;
    expect((await attempt(deps, "right")).kind).toBe("unavailable");
    expect(log.passwordChecks).toBe(0);
  });

  test("if the lockout check fails the login is refused, the password is never compared and the row is cleaned up", async () => {
    const { deps, log, rows } = fakeStore();
    log.failList = true;
    expect((await attempt(deps, "right")).kind).toBe("unavailable");
    expect(log.passwordChecks).toBe(0);
    expect(rows).toHaveLength(0);
  });
});

describe("runLoginAttempt: parallel guessing", () => {
  test("50 simultaneous wrong guesses from one IP: at most 5 reach the password check", async () => {
    const { deps, log, rows } = fakeStore({ jitter: true });
    const results = await Promise.all(Array.from({ length: 50 }, (_, i) => attempt(deps, `guess${i}`)));
    expect(log.passwordChecks).toBeLessThanOrEqual(LIMITS.perIp);
    expect(results.filter((r) => r.kind === "wrong").length).toBeLessThanOrEqual(LIMITS.perIp);
    expect(results.filter((r) => r.kind === "locked").length).toBeGreaterThanOrEqual(50 - LIMITS.perIp);
    expect(rows.length).toBeLessThanOrEqual(LIMITS.perIp);
  });

  test("50 simultaneous attempts including the correct password: at most 5 are compared in total", async () => {
    const { deps, log } = fakeStore({ jitter: true });
    const passwords = Array.from({ length: 50 }, (_, i) => (i === 40 ? "right" : `guess${i}`));
    await Promise.all(passwords.map((pw) => attempt(deps, pw)));
    expect(log.passwordChecks).toBeLessThanOrEqual(LIMITS.perIp);
  });

  test("the global cap holds against many IPs guessing at once: at most 20 are compared", async () => {
    const { deps, log } = fakeStore({ jitter: true });
    await Promise.all(Array.from({ length: 100 }, (_, i) => attempt(deps, `guess${i}`, `10.0.0.${i}`)));
    expect(log.passwordChecks).toBeLessThanOrEqual(LIMITS.global);
  });
});
