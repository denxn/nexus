"use client";

import { useEffect, useRef, useState } from "react";
import { showSystemNotice } from "@/lib/reminders/notify";
import { planReminders, pruneReminded, type ReminderTask } from "@/lib/reminders/schedule";
import styles from "./reminders.module.css";

const STORAGE_KEY = "nexus:reminded:v1";
const KEEP_MS = 3 * 24 * 60 * 60 * 1000;
const TOAST_MS = 60_000;

const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false });

type Stored = { key: string; at: number };

function readStored(): Stored[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStored(entries: Stored[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage can be unavailable (private mode); reminders then simply may repeat after a reload.
  }
}

/**
 * Runs for the whole app. Shows an in-app notice (and a browser notification when permitted) at each
 * reminder time, once per occurrence. It only works while a Nexus tab is open.
 */
export function ReminderScheduler({ tasks }: { tasks: ReminderTask[] }) {
  const [toasts, setToasts] = useState<{ key: string; title: string; startsAt: number }[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const now = Date.now();
    let stored = pruneReminded(readStored(), now, KEEP_MS);
    const reminded = new Set(stored.map((s) => s.key));

    const fire = (t: ReminderTask) => {
      if (reminded.has(t.key)) return; // another timer or tab got there first
      reminded.add(t.key);
      stored = [...stored, { key: t.key, at: Date.now() }];
      writeStored(stored);
      setToasts((cur) => (cur.some((c) => c.key === t.key) ? cur : [...cur, { key: t.key, title: t.title, startsAt: t.startsAt }]));
      timers.current.push(window.setTimeout(() => setToasts((cur) => cur.filter((c) => c.key !== t.key)), TOAST_MS));
      showSystemNotice(typeof Notification === "undefined" ? undefined : Notification, t.title, `Starts at ${clock.format(new Date(t.startsAt))}`, t.key);
    };

    const { fireNow, later } = planReminders(tasks, now, reminded);
    fireNow.forEach(fire);
    for (const t of later) timers.current.push(window.setTimeout(() => fire(t), t.delayMs));
    writeStored(stored);

    const active = timers.current;
    return () => {
      active.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [tasks]);

  if (toasts.length === 0) return null;
  return (
    <div className={styles.toasts} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.key} className={`glass ${styles.toast}`}>
          <div>
            <strong>{t.title}</strong>
            <span>Starts at {clock.format(new Date(t.startsAt))}</span>
          </div>
          <button type="button" aria-label={`Dismiss reminder for ${t.title}`} onClick={() => setToasts((cur) => cur.filter((c) => c.key !== t.key))}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
