export type TodoLike = {
  id: string;
  done: boolean;
  dueDate: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
};

const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
const UNDATED = "9999-99-99";

export function isOverdue(todo: TodoLike, todayKey: string): boolean {
  return !todo.done && todo.dueDate !== null && todo.dueDate < todayKey;
}

/**
 * Open todos ordered by due date (so overdue ones come first, undated last),
 * then priority; the sort is stable. Done todos keep their input order.
 */
export function orderTodos<T extends TodoLike>(
  todos: T[],
  _todayKey: string,
): { open: T[]; completed: T[] } {
  const open = todos
    .filter((t) => !t.done)
    .map((t, index) => ({ t, index }))
    .sort((a, b) => {
      const da = a.t.dueDate ?? UNDATED;
      const db = b.t.dueDate ?? UNDATED;
      if (da !== db) return da < db ? -1 : 1;
      const p = PRIORITY_RANK[a.t.priority] - PRIORITY_RANK[b.t.priority];
      return p !== 0 ? p : a.index - b.index;
    })
    .map(({ t }) => t);
  return { open, completed: todos.filter((t) => t.done) };
}
