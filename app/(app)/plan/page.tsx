import { GoalsPanel } from "@/components/plan/GoalsPanel";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { getGoals } from "@/lib/plan/queries";
import { parseTab } from "@/lib/plan/tab";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const tab = parseTab((await searchParams).tab);
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>Plan</h1>
      <PlanTabs active={tab} />
      {tab === "goals" && <GoalsPanel goals={await getGoals()} />}
      {tab === "problems" && <p style={{ color: "var(--muted)" }}>Problems are coming next.</p>}
      {tab === "todo" && <p style={{ color: "var(--muted)" }}>To-do is coming next.</p>}
    </div>
  );
}
