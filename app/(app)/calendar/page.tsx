import { DayAgenda } from "@/components/calendar/DayAgenda";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import styles from "@/components/calendar/calendar.module.css";
import { getCalendarData } from "@/lib/plan/queries";
import { dayKey, monthKeyOf, parseDay, parseMonth } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[]; day?: string | string[] }>;
}) {
  const params = await searchParams;
  const today = dayKey(new Date());
  const month = parseMonth(params.month);
  const day = parseDay(params.day) ?? (monthKeyOf(today) === month ? today : `${month}-01`);
  const { markers, agenda } = await getCalendarData(month, day);

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>Calendar</h1>
      <div className={styles.layout}>
        <section className={`glass ${styles.panel}`}>
          <MonthGrid month={month} selected={day} today={today} markers={markers} />
        </section>
        <DayAgenda key={day} day={day} agenda={agenda} />
      </div>
    </div>
  );
}
