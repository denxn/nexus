"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import {
  checkPassword,
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
} from "@/lib/auth";
import { clearFailures, recentFailures, recordFailure } from "@/lib/loginAttempts";
import { clientIp, evaluateLockout, lockoutMessage, parseLimits } from "@/lib/loginLockout";

const FAILURE_DELAY_MS = 500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const limits = parseLimits(process.env);
  const ip = clientIp(await headers());

  // Locked out? Refuse before looking at the password, and record nothing.
  try {
    const lock = evaluateLockout(await recentFailures(limits.windowMinutes), ip, new Date(), limits);
    if (lock.locked) return { ok: false, errors: { form: lockoutMessage(lock.retryAfterMinutes) } };
  } catch {
    return { ok: false, errors: { form: "Try again later" } }; // fail closed
  }

  if (!checkPassword(password)) {
    try {
      await recordFailure(ip);
    } catch {
      // The attempt is refused either way.
    }
    await sleep(FAILURE_DELAY_MS);
    return { ok: false, errors: { password: "Wrong password" } };
  }

  let token: string;
  try {
    token = await createSession();
  } catch {
    return { ok: false, errors: { form: "Server is not configured" } };
  }
  try {
    await clearFailures(ip);
  } catch {
    // Clearing is housekeeping; the login proceeds.
  }
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
