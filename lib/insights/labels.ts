import type { CorrMetric } from "./params";

export const METRIC_LABELS: Record<CorrMetric, { name: string; axis: string; color: string }> = {
  sleep: { name: "Sleep", axis: "Sleep (h)", color: "var(--c-sleep)" },
  study: { name: "Study", axis: "Study (min)", color: "var(--c-study)" },
  workout: { name: "Workout", axis: "Workout (min)", color: "var(--c-workout)" },
  calories: { name: "Calories", axis: "Calories (kcal)", color: "var(--c-calories)" },
  mood: { name: "Mood", axis: "Mood (1–10)", color: "var(--c-mood)" },
};
