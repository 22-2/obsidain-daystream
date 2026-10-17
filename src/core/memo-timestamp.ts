import { parseTimeWithDate, toLocalDateOnly, toLocalDateString } from "src/core/date-utils";

/** Worker-safe conversion that doesn't depend on Obsidian's renderer globals. */
export function resolveMemoTimestamp(
  noteDate: string,
  time: string,
  metadata: Record<string, string>,
): string {
  if (metadata.posted) {
    const posted = new Date(metadata.posted);
    if (!Number.isNaN(posted.getTime())) return posted.toISOString();
  }

  const noteDay = toLocalDateOnly(noteDate);
  if (Number.isNaN(noteDay.getTime())) return new Date(0).toISOString();

  const parsed = parseTimeWithDate(time, toLocalDateString(noteDay));
  return Number.isNaN(parsed.getTime()) ? noteDay.toISOString() : parsed.toISOString();
}
