"use client";

import type { EntryTypeName } from "@/lib/entries/meta";
import { useQuickLog } from "../QuickLog";
import styles from "./history.module.css";

export function LogButton({ type, label }: { type: EntryTypeName; label: string }) {
  const { openNew } = useQuickLog();
  return (
    <button type="button" className={styles.primary} onClick={() => openNew(type)}>
      {label}
    </button>
  );
}
