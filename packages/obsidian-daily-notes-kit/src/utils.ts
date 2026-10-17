import type { Moment } from "moment";
import type { TFile } from "obsidian";
import type { Granularity } from "./granularity";
import type { NoteNameOptions, DailyNotesHost } from "./host";
import { getNoteSettings } from "./settings";

/**
 * dateUID is a way of weekly identifying daily/weekly/monthly notes.
 * They are prefixed with the granularity to avoid ambiguity.
 */
export function getDateUID(date: Moment, granularity: Granularity = "day"): string {
  const ts = date.clone().startOf(granularity).format();
  return `${granularity}-${ts}`;
}

/**
 * Extract date from filename based on granularity settings.
 */
export function getDateFromFilename(
  host: DailyNotesHost,
  filename: string,
  granularity: Granularity,
  { prefix = "" }: NoteNameOptions = {},
): Moment | null {
  const settings = getNoteSettings(host, granularity);

  // If prefix is specified, it must match.
  if (prefix && !filename.startsWith(prefix)) {
    return null;
  }

  const datePart = prefix ? filename.slice(prefix.length) : filename;
  const date = window.moment(datePart, settings.format, true);

  if (!date.isValid()) {
    return null;
  }

  // Extra check for unprefixed notes to avoid picking up prefixed ones
  if (!prefix) {
    const formatted = date.format(settings.format);
    if (datePart !== formatted) {
      return null;
    }
  }

  return date;
}

/**
 * Extract date from TFile.
 */
export function getDateFromFile(
  host: DailyNotesHost,
  file: TFile,
  granularity: Granularity,
  options: NoteNameOptions = {},
): Moment | null {
  return getDateFromFilename(host, file.basename, granularity, options);
}
