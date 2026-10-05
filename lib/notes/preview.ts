const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** One line for lists: whitespace collapsed, cut after `max` characters (never inside an emoji or accent) with an ellipsis. */
export function notePreview(body: string, max = 140): string {
  const text = body.replace(/\s+/g, " ").trim();
  const chars = [...segmenter.segment(text)].map((s) => s.segment);
  if (chars.length <= max) return text;
  return chars.slice(0, max).join("").trimEnd() + "…";
}
