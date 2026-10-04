"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import {
  checkPassword,
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
} from "@/lib/auth";

export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    return { ok: false, errors: { password: "Wrong password" } };
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
