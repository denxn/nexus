/**
 * Escapes the characters that mean something in a SQL LIKE pattern, so a search for "100%" or "a_b"
 * matches those characters literally. Postgres uses backslash as the default LIKE escape character.
 */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}
