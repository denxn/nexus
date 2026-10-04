import { createHash, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "nexus_session";
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30;

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Constant-time check against APP_PASSWORD; fails closed when it is unset or empty. */
export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(digest(input), digest(expected));
}

function secretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  return secret ? new TextEncoder().encode(secret) : null;
}

export async function createSession(): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("SESSION_SECRET is not set");
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(key);
}

/** Throws unless the token is a valid session; for guarding Server Actions themselves. */
export async function assertAuthed(token: string | undefined): Promise<void> {
  if (!(await verifySession(token))) throw new Error("Unauthorized");
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  const key = secretKey();
  if (!token || !key) return false;
  try {
    await jwtVerify(token, key, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}
