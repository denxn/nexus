import Link from "next/link";
import { TABS, type Tab } from "@/lib/plan/tab";
import styles from "./plan.module.css";

const LABELS: Record<Tab, string> = { goals: "Goals", problems: "Problems", todo: "To-do" };

export function PlanTabs({ active }: { active: Tab }) {
  return (
    <nav className={styles.tabs} aria-label="Plan sections">
      {TABS.map((t) => (
        <Link
          key={t}
          href={`/plan?tab=${t}`}
          className={t === active ? styles.tabOn : undefined}
          aria-current={t === active ? "page" : undefined}
        >
          {LABELS[t]}
        </Link>
      ))}
    </nav>
  );
}
