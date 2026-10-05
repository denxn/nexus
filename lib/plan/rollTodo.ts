import { prisma } from "@/lib/db";
import { nextOccurrence, type Rule } from "@/lib/recurrence/rule";
import { dayKey } from "@/lib/time";

type TodoRule = {
  repeat: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  repeatInterval: number;
  repeatWeekdays: number[];
  repeatUntil: string | null;
  repeatMonthDay: number | null;
};

export const ruleOfTodo = (t: TodoRule): Rule => ({
  repeat: t.repeat,
  interval: t.repeatInterval,
  weekdays: t.repeatWeekdays,
  until: t.repeatUntil,
  monthDay: t.repeatMonthDay,
});

/**
 * Rolls an open recurring to-do to its next occurrence: the first one strictly after max(old due, today).
 * "complete" also keeps a completed copy for the occurrence just finished (so the history and the
 * discipline score stay honest); "skip" does not. With no next occurrence the to-do itself becomes done.
 * The writes are guarded by the due date that was read, so a double tick moves it once and makes one copy.
 * Returns false when the to-do is not an open recurring one (the caller falls back to a plain toggle).
 */
export async function advanceTodo(id: string, mode: "complete" | "skip", today: string = dayKey(new Date())): Promise<boolean> {
  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo || todo.done || todo.repeat === "NONE" || !todo.dueDate) return false;

  const old = todo.dueDate;
  const next = nextOccurrence(ruleOfTodo(todo), old, old > today ? old : today);

  await prisma.$transaction(async (tx) => {
    const moved = await tx.todo.updateMany({
      where: { id, done: false, dueDate: old },
      data: next ? { dueDate: next } : { done: true, doneAt: new Date() },
    });
    if (moved.count === 0 || mode === "skip" || !next) return;
    await tx.todo.create({
      data: {
        title: todo.title,
        dueDate: old,
        priority: todo.priority,
        goalId: todo.goalId,
        problemId: todo.problemId,
        done: true,
        doneAt: new Date(),
      },
    });
  });
  return true;
}
