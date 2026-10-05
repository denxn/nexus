type NotificationCtor = { permission: string; new (title: string, options?: { body?: string; tag?: string }): unknown };

/** Shows a system notification when permitted. Never throws: some browsers only allow it via a service worker. */
export function showSystemNotice(ctor: NotificationCtor | undefined, title: string, body: string, tag: string): boolean {
  if (!ctor || ctor.permission !== "granted") return false;
  try {
    new ctor(title, { body, tag });
    return true;
  } catch {
    return false;
  }
}
