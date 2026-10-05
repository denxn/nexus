import type { Rule } from "./rule";

const NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const shortDate = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${day}T00:00:00Z`));

/** "Weekly on Mon, Wed", "Every 2 weeks", "Daily until 5 Nov"; empty for no repeat. */
export function repeatLabel(rule: Rule): string {
  if (rule.repeat === "NONE") return "";
  const n = rule.interval;
  const days = [...rule.weekdays].sort((a, b) => a - b).map((d) => NAMES[d]);
  let text: string;
  switch (rule.repeat) {
    case "DAILY":
      text = n === 1 ? "Daily" : `Every ${n} days`;
      break;
    case "WEEKLY":
      text = (n === 1 ? "Weekly" : `Every ${n} weeks`) + (days.length ? ` on ${days.join(", ")}` : "");
      break;
    default:
      text = n === 1 ? "Monthly" : `Every ${n} months`;
  }
  return rule.until ? `${text} until ${shortDate(rule.until)}` : text;
}
