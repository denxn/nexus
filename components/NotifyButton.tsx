"use client";

import { useEffect, useState } from "react";
import styles from "./reminders.module.css";

/** Asks for permission to show browser notifications. Hidden where the browser does not support them. */
export function NotifyButton() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(null);

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  if (permission === null || permission === "unsupported") return null;
  if (permission === "granted") return <span className={styles.notifyState}>Browser notifications on</span>;
  if (permission === "denied") return <span className={styles.notifyState}>Notifications are blocked in your browser settings</span>;
  return (
    <button type="button" className={styles.notifyButton} onClick={() => Notification.requestPermission().then(setPermission)}>
      Enable notifications
    </button>
  );
}
