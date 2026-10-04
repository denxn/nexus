export type EntryTypeName = "WORKOUT" | "STUDY" | "SLEEP" | "MEAL" | "MOOD";

export type EntryRow = {
  id: string;
  type: EntryTypeName;
  value: number;
  label: string | null;
  occurredAt: string; // ISO
};

export const ENTRY_TYPES: {
  type: EntryTypeName;
  name: string;
  unit: string;
  placeholder: string;
  color: string;
}[] = [
  { type: "WORKOUT", name: "Workout", unit: "minutes", placeholder: "Pull workout", color: "var(--c-workout)" },
  { type: "STUDY", name: "Study", unit: "minutes", placeholder: "Mathematics", color: "var(--c-study)" },
  { type: "SLEEP", name: "Sleep", unit: "hours", placeholder: "Quality, notes", color: "var(--c-sleep)" },
  { type: "MEAL", name: "Meal", unit: "kcal", placeholder: "Lunch", color: "var(--c-calories)" },
  { type: "MOOD", name: "Mood", unit: "1 to 10", placeholder: "How was today?", color: "var(--c-mood)" },
];

export const typeMeta = (type: EntryTypeName) =>
  ENTRY_TYPES.find((t) => t.type === type)!;
