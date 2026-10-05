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

export type ProblemView = {
  id: string;
  title: string;
  trigger: string | null;
  counterPlan: string | null;
  severity: number;
  status: "ACTIVE" | "IMPROVING" | "SOLVED";
  occurrenceCount: number;
  occurrences: { id: string; occurredAt: string; note: string | null }[]; // newest first, latest 100
};

export type TodoView = {
  id: string;
  title: string;
  dueDate: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  done: boolean;
  goalId: string | null;
  goalTitle: string | null;
  problemId: string | null;
  problemTitle: string | null;
  repeat: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  repeatInterval: number;
  repeatWeekdays: number[];
  repeatUntil: string | null;
};

export type EventView = {
  id: string;
  title: string;
  startsAt: string; // ISO
  endsAt: string | null; // ISO
};

export type DayAgendaData = {
  events: EventView[];
  todos: { id: string; title: string; done: boolean; priority: "LOW" | "MEDIUM" | "HIGH" }[];
  logged: { type: string; text: string }[];
  notes: { id: string; title: string | null; preview: string }[];
};
