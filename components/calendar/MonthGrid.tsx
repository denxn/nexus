import Link from "next/link";
import type { DayMarkers } from "@/lib/plan/calendar";
import { addMonths, monthMatrix } from "@/lib/time";
import styles from "./calendar.module.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const monthTitle = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

export function MonthGrid({
  month,
  selected,
  today,
  markers,
  base = "/calendar",
  compact = false,
}: {
  month: string;
  selected?: string;
  today: string;
  markers: Record<string, DayMarkers>;
  base?: string;
  compact?: boolean;
}) {
  return (
    <div className={`${styles.month} ${compact ? styles.compact : ""}`}>
      <div className={styles.monthHead}>
        {!compact && <Link href={`${base}?month=${addMonths(month, -1)}`} aria-label="Previous month">‹</Link>}
        <strong>{monthTitle(month)}</strong>
        {!compact && <Link href={`${base}?month=${addMonths(month, 1)}`} aria-label="Next month">›</Link>}
      </div>
      <div className={styles.weekdays} aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d}>{compact ? d[0] : d}</span>
        ))}
      </div>
      <div className={styles.cells}>
        {monthMatrix(month).flat().map(({ day, inMonth }) => {
          const m = markers[day];
          const cls = [
            styles.cell,
            inMonth ? "" : styles.out,
            day === today ? styles.today : "",
            day === selected ? styles.selected : "",
          ].join(" ");
          return (
            <Link key={day} href={`${base}?month=${month}&day=${day}`} className={cls} aria-label={day} aria-current={day === selected ? "date" : undefined}>
              <span>{Number(day.slice(8))}</span>
              <i className={styles.dots} aria-hidden>
                {m?.event && <b style={{ background: "var(--accent)" }} />}
                {m?.todo && <b style={{ background: "var(--c-mood)" }} />}
                {m?.logged && <b style={{ background: "var(--c-workout)" }} />}
                {m?.note && <b style={{ background: "var(--c-sleep)" }} />}
              </i>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
