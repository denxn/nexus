import { prisma } from "@/lib/db";
import type { EntryRow } from "@/lib/entries/meta";
import { aggregateDaily, type DayStats } from "@/lib/stats";
import { getTargets, type Targets } from "@/lib/targets";
import { addDays, dayKey, daysBetween, rangeKeys } from "@/lib/time";
import { groupByDay } from "./group";
import { labelBreakdown, type LabelRow } from "./labels";
import { paginate } from "./paginate";
import type { HistoryRange } from "./params";
import type { Entry } from "./summaries";

export type HistoryType = "WORKOUT" | "STUDY" | "SLEEP";

export const PAGE_SIZE = 50;
const CHIP_LIMIT = 8;
const MAX_WINDOW_DAYS = 3650;
const DEFAULT_ALL_DAYS = 30;

export type HistoryData = {
  windowDays: number;
  days: DayStats[]; // zero-filled, label filter applied
  chips: LabelRow[]; // from the window, before the label filter
  activeLabel: string | null;
  groups: { day: string; total: number; entries: EntryRow[] }[];
  pagination: { page: number; pages: number; total: number };
  entries: Entry[]; // the filtered entries, for the summaries
  targets: Targets;
  today: string;
};

/** Entries of one type over the window, with the label filter and paging applied in memory. */
export async function getHistory(
  type: HistoryType,
  params: { range: HistoryRange; label: string | null; page: number },
): Promise<HistoryData> {
  const today = dayKey(new Date());

  let windowDays: number;
  if (params.range === "all") {
    const first = await prisma.entry.findFirst({
      where: { type },
      orderBy: { occurredAt: "asc" },
      select: { occurredAt: true },
    });
    windowDays = first
      ? Math.min(MAX_WINDOW_DAYS, Math.max(1, daysBetween(dayKey(first.occurredAt), today) + 1))
      : DEFAULT_ALL_DAYS;
  } else {
    windowDays = params.range;
  }
  const keys = rangeKeys(today, windowDays);

  // One day of padding so DST offsets cannot drop rows; everything is re-filtered by Rome day below.
  const [targets, rows] = await Promise.all([
    getTargets(),
    prisma.entry.findMany({
      where: { type, occurredAt: { gte: new Date(`${addDays(keys[0], -1)}T00:00:00Z`) } },
      orderBy: { occurredAt: "desc" },
      select: { id: true, type: true, occurredAt: true, value: true, label: true },
    }),
  ]);
  const inWindow = rows.filter((r) => {
    const k = dayKey(r.occurredAt);
    return k >= keys[0] && k <= today;
  });

  const chips = labelBreakdown(inWindow, CHIP_LIMIT);
  const wanted = params.label?.trim().toLowerCase() ?? null;
  const filtered = wanted ? inWindow.filter((r) => r.label?.trim().toLowerCase() === wanted) : inWindow;

  const page = paginate(filtered, params.page, PAGE_SIZE);
  const groups = groupByDay(page.items).map((g) => ({
    day: g.day,
    total: g.total,
    entries: g.entries.map((r) => ({
      id: r.id,
      type: r.type as EntryRow["type"],
      value: r.value,
      label: r.label,
      occurredAt: r.occurredAt.toISOString(),
    })),
  }));

  return {
    windowDays,
    days: aggregateDaily(filtered, keys),
    chips,
    activeLabel: params.label,
    groups,
    pagination: { page: page.page, pages: page.pages, total: page.total },
    entries: filtered,
    targets,
    today,
  };
}
