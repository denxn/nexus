import { QuickLogProvider } from "@/components/QuickLog";
import { ReminderScheduler } from "@/components/ReminderScheduler";
import { Sidebar } from "@/components/Sidebar";
import { getUpcomingReminders } from "@/lib/reminders/queries";
import styles from "./shell.module.css";

// Reminder times depend on "now", so this layout must never be cached.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const tasks = await getUpcomingReminders();
  return (
    <QuickLogProvider>
      <div className={styles.shell}>
        <Sidebar />
        <main className={styles.main}>{children}</main>
      </div>
      <ReminderScheduler tasks={tasks} />
    </QuickLogProvider>
  );
}
