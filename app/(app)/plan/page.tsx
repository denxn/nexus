import { GoalsPanel } from "@/components/plan/GoalsPanel";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { ProblemsPanel } from "@/components/plan/ProblemsPanel";
import { TodoPanel } from "@/components/plan/TodoPanel";
import { getGoalAndProblemOptions, getGoals, getProblems, getTodos } from "@/lib/plan/queries";
import { parseTab } from "@/lib/plan/tab";
import { dayKey } from "@/lib/time";

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
      {tab === "problems" && <ProblemsPanel problems={await getProblems()} />}
      {tab === "todo" && (
        <TodoPanel
          todos={await getTodos()}
          {...(await getGoalAndProblemOptions())}
          todayKey={dayKey(new Date())}
        />
      )}
    </div>
  );
}
