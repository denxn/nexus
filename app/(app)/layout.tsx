import { QuickLogProvider } from "@/components/QuickLog";
import { Sidebar } from "@/components/Sidebar";
import styles from "./shell.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QuickLogProvider>
      <div className={styles.shell}>
        <Sidebar />
        <main className={styles.main}>{children}</main>
      </div>
    </QuickLogProvider>
  );
}
