"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import styles from "./Sidebar.module.css";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/plan", label: "Plan" },
  { href: "/workouts", label: "Workouts" },
  { href: "/study", label: "Study" },
  { href: "/sleep", label: "Sleep" },
  { href: "/calendar", label: "Calendar" },
  { href: "/goals", label: "Goals" },
  { href: "/analytics", label: "Analytics" },
  { href: "/flaws", label: "Flaws" },
  { href: "/notes", label: "Notes" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className={styles.side}>
      <div className={styles.brand}>NEXUS</div>
      <nav className={styles.nav}>
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action={logout} className={styles.logout}>
        <button type="submit">Log out</button>
      </form>
    </aside>
  );
}
