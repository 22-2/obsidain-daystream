import type { MomentLike } from "src/ui/types";

interface ParsedTask {
  displayName: string;
  timestamp: MomentLike;
}

export function parseTaskTimestamp(name: string, fileBasename: string): ParsedTask {
  // Regex for "HH:mm:ss" or "YYYY-MM-DD HH:mm:ss" at the start of the task text.
  // This is typical for Thino-style tasks.
  const timeMatch = name.match(/^((?:\d{4}-\d{2}-\d{2}\s+)?\d{2}:\d{2}:\d{2})\s+(.*)$/s);

  let timestamp: MomentLike;
  let displayName = name;

  if (timeMatch) {
    const timeStr = timeMatch[1];
    displayName = timeMatch[2];

    if (timeStr.includes("-")) {
      // It includes a date: "YYYY-MM-DD HH:mm:ss"
      timestamp = window.moment(timeStr, "YYYY-MM-DD HH:mm:ss");
    } else {
      // It only has time: "HH:mm:ss". Combine it with the file's date.
      // We assume fileBasename is "YYYY-MM-DD".
      timestamp = window.moment(`${fileBasename} ${timeStr}`, "YYYY-MM-DD HH:mm:ss");
    }
  } else {
    // No time found in text. Use the file name as the date.
    timestamp = window.moment(fileBasename, "YYYY-MM-DD");
  }

  // If the result is still invalid, fallback to current time
  if (!timestamp.isValid()) {
    timestamp = window.moment();
  }

  return { displayName, timestamp };
}
