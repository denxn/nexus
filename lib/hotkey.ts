type KeyEventLike = {
  key: string;
  target: { tagName?: string; isContentEditable?: boolean } | null;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
};

const TEXT_TARGETS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** True only for a bare `n` pressed outside any text-entry element. */
export function shouldOpenQuickLog(e: KeyEventLike): boolean {
  if (e.key?.toLowerCase() !== "n") return false;
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (e.target?.isContentEditable) return false;
  if (e.target?.tagName && TEXT_TARGETS.has(e.target.tagName)) return false;
  return true;
}
