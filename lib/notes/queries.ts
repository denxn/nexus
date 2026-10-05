import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { groupNotesByDay } from "./group";
import { escapeLike } from "./like";

export const NOTES_PAGE_SIZE = 20;

export type NoteView = {
  id: string;
  day: string;
  title: string | null;
  body: string;
  createdAt: string; // ISO
};

/** Notes matching the filters, newest day first, one page at a time (the page is clamped into range). */
export async function getNotes(params: { q: string | null; day: string | null; page: number }) {
  // Prisma passes `contains` straight into LIKE, so wildcard characters in the query must be escaped.
  const needle = params.q ? escapeLike(params.q) : null;
  const where: Prisma.NoteWhereInput = {
    ...(params.day && { day: params.day }),
    ...(needle && {
      OR: [
        { title: { contains: needle, mode: "insensitive" } },
        { body: { contains: needle, mode: "insensitive" } },
      ],
    }),
  };
  const total = await prisma.note.count({ where });
  const pages = Math.max(1, Math.ceil(total / NOTES_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page), pages);
  const rows = await prisma.note.findMany({
    where,
    orderBy: [{ day: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * NOTES_PAGE_SIZE,
    take: NOTES_PAGE_SIZE,
  });
  const groups = groupNotesByDay(rows).map((g) => ({
    day: g.day,
    notes: g.notes.map(
      (n): NoteView => ({ id: n.id, day: n.day, title: n.title, body: n.body, createdAt: n.createdAt.toISOString() }),
    ),
  }));
  return { groups, pagination: { page, pages, total } };
}
