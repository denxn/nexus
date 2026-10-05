/**
 * The y-axis for a history chart. The axis must reach the target line (Recharts would otherwise
 * size it from the data alone and drop the line when no day reaches the target), so `max` is the
 * larger of the data and the target. Minute charts get whole-hour ticks; hour charts use automatic ticks.
 */
export function chartAxis(
  values: number[],
  target: number | undefined,
  unit: "min" | "h",
): { max: number; ticks: number[] | undefined } {
  const top = Math.max(1, ...values, target ?? 0);
  if (unit === "h") return { max: Math.ceil(top), ticks: undefined };
  const step = top <= 240 ? 60 : top <= 480 ? 120 : 240;
  const count = Math.ceil(top / step);
  return { max: count * step, ticks: Array.from({ length: count + 1 }, (_, i) => i * step) };
}
