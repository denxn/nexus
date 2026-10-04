import { prisma } from "@/lib/db";
import type { EntryRow } from "./meta";

export async function getRecentEntries(limit = 8): Promise<EntryRow[]> {
  const rows = await prisma.entry.findMany({
    orderBy: { occurredAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    value: r.value,
    label: r.label,
    occurredAt: r.occurredAt.toISOString(),
  }));
}
