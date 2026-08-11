import type { TFile } from "obsidian";
import { getPeriodicSettings } from "src/lib/daily-notes/settings";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import type { Granularity, MomentLike } from "src/ui/types";

/**
 * dateUID is a way of weekly identifying daily/weekly/monthly notes.
 * They are prefixed with the granularity to avoid ambiguity.
 */
export function getDateUID(date: MomentLike, granularity: Granularity = "day"): string {
  const ts = date.clone().startOf(granularity).format();
  return `${granularity}-${ts}`;
}

/**
 * Extract date from filename based on granularity settings.
 */
export function getDateFromFilename(
  filename: string,
  granularity: Granularity,
  shell: ObsidianAppShell,
  topicId: string = "",
): MomentLike | null {
  const settings = getPeriodicSettings(granularity, shell);
  const prefix = topicId ? `${topicId}-` : "";

  // If prefix is specified, it must match.
  if (prefix && !filename.startsWith(prefix)) {
    return null;
  }

  const datePart = prefix ? filename.slice(prefix.length) : filename;
  const date = window.moment(datePart, settings.format, true);

  if (!date.isValid()) {
    return null;
  }

  // Extra check for default topic to avoid picking up other topics
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
  file: TFile,
  granularity: Granularity,
  shell: ObsidianAppShell,
  topicId: string = "",
): MomentLike | null {
  return getDateFromFilename(file.basename, granularity, shell, topicId);
}
