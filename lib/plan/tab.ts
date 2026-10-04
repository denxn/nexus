export const TABS = ["goals", "problems", "todo"] as const;
export type Tab = (typeof TABS)[number];

export function parseTab(v: string | string[] | undefined): Tab {
  const raw = Array.isArray(v) ? v[0] : v;
  return (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "goals";
}
