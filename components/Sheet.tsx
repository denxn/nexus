"use client";

import { useEffect } from "react";
import styles from "./Sheet.module.css";

/** Modal bottom sheet (centered on wide screens); Escape and backdrop click close it. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`glass ${styles.sheet}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.heading}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
