# Nexus: Stage 4c design (Notes)

Date: 2026-10-05. Third Stage 4 sub-stage (4a and 4b merged; 4d reminders and recurring follows). Earlier Global Constraints apply: Rome day keys (years 1970 to 2100), `requireSession()` first in every Server Action, Zod on every input including ids, saves through `withSaveErrors`, vitest under TZ=UTC, nothing deployed.

## Purpose

Free-text notes per day (journal entries and reflections) that live next to the calendar. Success means Dennis can write, find and revisit notes quickly, and see on the calendar which days have one.

## Scope

In: `Note` table (one additive migration); `/notes` page with search, a day filter, add/edit/delete and pagination; calendar integration (a fourth marker, a Notes section in the day agenda, "+ Note", a link to the full note).
Out (YAGNI): markdown, attachments, tags, pinning, linking notes to goals or problems, exports, a dashboard notes card, reminders (4d).

## Data

`Note`: `id`, `day` (String day key, Rome), `title` (optional, up to 80 chars), `body` (required, 1 to 5000 chars after trimming ends; inner newlines kept), `createdAt`, `updatedAt`; index on `day`. A day can have several notes.

## Pages and behavior

- `/notes?q=&day=&page=`: notes grouped by day, newest day first, newest created first within a day, 20 per page (paging splits the note list, then groups). `q` (trimmed, up to 100 chars) matches title or body case-insensitively as a plain substring (wildcard characters `%` and `_` are literal). `day` (a real day key) shows only that day; invalid values are ignored. A search form and a clearable chip for the active day filter. Plain text with line breaks preserved (`white-space: pre-wrap`); React escaping means no sanitizing is needed.
- Add, edit and delete use the existing `Sheet` pattern; the form has Date (default today in Rome), Title (optional) and Note (textarea); errors are inline and typed values are kept; delete asks for confirmation.
- Calendar: days with notes get a fourth marker dot; the day agenda gets a "Notes" section listing each note's title (or "Untitled") and a preview of at most 140 characters (whitespace collapsed, cut on character boundaries with an ellipsis), a "+ Note" button that opens the add sheet already set to that day, and an "Open" link to `/notes?day=…`. The dashboard mini calendar shows the same marker.

## Architecture

Pure tested modules in `lib/notes/`: `schema.ts` (`noteSchema`), `params.ts` (`parseNotesParams`), `preview.ts` (`notePreview`), `group.ts` (`groupNotesByDay`). `lib/notes/queries.ts` (`getNotes`). Actions in `app/actions/notes.ts` (`createNote`, `updateNote`, `deleteNote`) using `parseWith`, `parseId`, `requireSession`, `withSaveErrors` and revalidating `/notes`, `/calendar` and `/`. `buildMarkers` gains an optional notes argument and `DayMarkers` a `note` flag; `getCalendarData` also returns the selected day's note previews. UI: `components/notes/NoteForm.tsx` (shared by `/notes` and the calendar agenda), `NotesList`, and the page; the history `Pagination` component is reused.

## Testing

Unit tests first: schema (impossible date, year outside range, empty and whitespace-only body, 5000 vs 5001 chars, title 80 vs 81, blank title becomes undefined, newlines kept), params (junk, arrays, whitespace `q`, long `q`, invalid day, page fallbacks), preview (short text unchanged, long text cut at 140 with an ellipsis, newlines collapsed, emoji and combined characters not split, empty body), grouping (order, 23:30 Rome createdAt tie-breaks, empty input), calendar markers with notes. Live checks on the demo data: create, search (including `%` and `_` literal), day filter, edit, delete, pagination with more than 20 notes, the calendar marker, agenda section, "+ Note" and the link. A Playwright test covers add, search, edit, delete and the calendar link.

## Delivery

One branch (`feat/stage4c`), one migration (table creation only), a fresh-reviewer pass, then merge.
