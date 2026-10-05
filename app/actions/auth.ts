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
import { clearFailures, deleteAttempt, insertAttempt, recentFailures } from "@/lib/loginAttempts";
import { runLoginAttempt, type LoginDeps } from "@/lib/loginFlow";
import { clientIp, lockoutMessage, parseLimits } from "@/lib/loginLockout";

const realDeps: LoginDeps = {
  insertAttempt,
  recentFailures,
  deleteAttempt,
  clearFailures,
  checkPassword,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => new Date(),
};

export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const outcome = await runLoginAttempt(realDeps, {
    ip: clientIp(await headers()),
    password,
    limits: parseLimits(process.env),
  });

  switch (outcome.kind) {
    case "locked":
      return { ok: false, errors: { form: lockoutMessage(outcome.minutes) } };
    case "unavailable":
      return { ok: false, errors: { form: "Try again later" } }; // fails closed
    case "wrong":
      return { ok: false, errors: { password: "Wrong password" } };
    case "success":
      break;
  }

  let token: string;
  try {
    token = await createSession();
  } catch {
    return { ok: false, errors: { form: "Server is not configured" } };
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
