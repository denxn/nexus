import { cookies } from "next/headers";
import { assertAuthed, SESSION_COOKIE } from "@/lib/auth";

/** Call at the top of every Server Action: the proxy alone is not enough protection. */
export async function requireSession(): Promise<void> {
  await assertAuthed((await cookies()).get(SESSION_COOKIE)?.value);
}
