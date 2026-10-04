export type Targets = {
  studyMin: number;
  sleepH: number;
  kcal: number;
  workoutsPerWeek: number;
};

export const DEFAULT_TARGETS: Targets = {
  studyMin: 240,
  sleepH: 8,
  kcal: 2800,
  workoutsPerWeek: 4,
};

/** Targets from the Target table, falling back to the defaults per field. */
export async function getTargets(): Promise<Targets> {
  const { prisma } = await import("./db");
  const rows = await prisma.target.findMany();
  const pick = (type: string, period: string, fallback: number) =>
    rows.find((r) => r.type === type && r.period === period)?.value ??
    fallback;
  return {
    studyMin: pick("STUDY", "DAY", DEFAULT_TARGETS.studyMin),
    sleepH: pick("SLEEP", "DAY", DEFAULT_TARGETS.sleepH),
    kcal: pick("MEAL", "DAY", DEFAULT_TARGETS.kcal),
    workoutsPerWeek: pick("WORKOUT", "WEEK", DEFAULT_TARGETS.workoutsPerWeek),
  };
}
