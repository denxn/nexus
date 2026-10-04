/** 150 -> "2 h 30 m"; 45 -> "45 m". */
export function formatDuration(totalMin: number): string {
  const m = Math.round(totalMin);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return h > 0 ? `${h} h ${rest} m` : `${rest} m`;
}

/** Minutes as hours with one decimal: 150 -> "2.5". */
export function formatHours(totalMin: number): string {
  return (totalMin / 60).toFixed(1);
}

export function formatKcal(kcal: number): string {
  return Math.round(kcal).toLocaleString("en-US");
}

/** Human display of an entry's value, by entry type. */
export function formatEntryValue(type: string, value: number): string {
  switch (type) {
    case "WORKOUT":
    case "STUDY":
      return formatDuration(value);
    case "SLEEP":
      return `${Number.isInteger(value) ? value : value.toFixed(1)} h`;
    case "MEAL":
      return `${formatKcal(value)} kcal`;
    case "MOOD":
      return `${value}/10`;
    default:
      return String(value);
  }
}
