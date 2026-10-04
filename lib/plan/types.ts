export type GoalView = {
  id: string;
  title: string;
  category: string | null;
  deadline: string | null;
  status: "ACTIVE" | "DONE" | "PAUSED";
  kind: "MANUAL" | "MEASURED";
  progress: number | null;
  measuredType: "WORKOUT" | "STUDY" | "SLEEP" | "MEAL" | null;
  targetValue: number | null;
  startDate: string | null;
  createdAt: string; // ISO
  value: number; // measured sum, or the manual percent
  pct: number; // whole number, uncapped
  overdue: boolean;
};
