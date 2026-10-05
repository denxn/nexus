export type BriefInput = {
  greeting: string;
  score: number;
  streak: number;
  hasData: boolean;
  correlation: { caption: string } | null;
  flaw: { title: string; metric: "sleep" | "study" | "mood"; changePct: number } | null;
  overdueTodos: number;
  goal: { title: string; daysLeft: number; pct: number } | null;
  yesterdaySleepH: number | null;
  sleepTarget: number;
  daysSinceWorkout: number | null;
};

const MAX_LINES = 4;

/** A short, deterministic summary built only from the user's own numbers. */
export function buildBrief(input: BriefInput): { headline: string; lines: string[] } {
  if (!input.hasData) {
    return {
      headline: `${input.greeting}.`,
      lines: ["Log your first entries and I will start finding patterns."],
    };
  }

  const streak = input.streak >= 2 ? ` · ${input.streak}-day streak` : "";
  const headline = `${input.greeting}. Discipline score ${input.score}/100${streak}`;

  const lines: string[] = [];
  if (input.correlation) lines.push(input.correlation.caption);
  if (input.flaw) {
    const { title, metric, changePct } = input.flaw;
    lines.push(`After "${title}", your ${metric} is ${Math.abs(changePct)}% ${changePct < 0 ? "lower" : "higher"} than usual.`);
  }
  if (input.overdueTodos === 1) lines.push("1 to-do is overdue");
  else if (input.overdueTodos > 1) lines.push(`${input.overdueTodos} to-dos are overdue`);
  if (input.goal) {
    const { title, daysLeft, pct } = input.goal;
    const when = daysLeft <= 0 ? "today" : `in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
    lines.push(`${title} is due ${when} at ${pct}%`);
  }
  if (input.yesterdaySleepH !== null && input.yesterdaySleepH < input.sleepTarget) {
    lines.push("Aim for an earlier night tonight");
  } else if (input.daysSinceWorkout !== null && input.daysSinceWorkout >= 3) {
    lines.push("A workout today would keep your week on track");
  }

  return { headline, lines: lines.slice(0, MAX_LINES) };
}
