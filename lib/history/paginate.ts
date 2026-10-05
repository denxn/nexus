/** One page of `items`; the page number is clamped into 1..pages and there is always at least one page. */
export function paginate<T>(
  items: T[],
  page: number,
  size: number,
): { items: T[]; page: number; pages: number; total: number } {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages, total: items.length };
}
