import {
  createNote,
  getAllNotes,
  getDateFromFilename as getDateFromPrefixedFilename,
  getNote,
  resolveNotePath,
  type Granularity,
  type NoteNameOptions,
} from "@22-2/obsidian-daily-notes-kit";
import type { TFile } from "obsidian";
import type { MomentLike } from "src/core/domain/post";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";

export { getDateUID } from "@22-2/obsidian-daily-notes-kit";

// 意図: 「トピック」はこのアプリの概念なので、パッケージにはファイル名の接頭辞としてだけ渡す。
// topicId="" → "2026-03-04.md"、topicId="novel" → "novel-2026-03-04.md"
function toNoteNameOptions(topicId: string): NoteNameOptions {
  return { prefix: topicId ? `${topicId}-` : "" };
}

export function resolveTopicNotePath(
  date: MomentLike,
  g: Granularity,
  topicId: string,
  shell: ObsidianAppShell,
): string {
  return resolveNotePath(shell, date, g, toNoteNameOptions(topicId));
}

/**
 * Vault内からトピック付きノートを全件取得し、dateUID -> TFile のマップを返す。
 */
export function getAllTopicNotes(
  shell: ObsidianAppShell,
  g: Granularity,
  topicId: string = "",
): Record<string, TFile> {
  return getAllNotes(shell, g, toNoteNameOptions(topicId));
}

export function getTopicNote(
  shell: ObsidianAppShell,
  date: MomentLike,
  g: Granularity,
  topicId: string,
): TFile | null {
  return getNote(shell, date, g, toNoteNameOptions(topicId));
}

export function createTopicNote(
  shell: ObsidianAppShell,
  date: MomentLike,
  g: Granularity,
  topicId: string,
): Promise<TFile> {
  return createNote(shell, date, g, toNoteNameOptions(topicId));
}

export function getDateFromFilename(
  filename: string,
  granularity: Granularity,
  shell: ObsidianAppShell,
  topicId: string = "",
): MomentLike | null {
  return getDateFromPrefixedFilename(shell, filename, granularity, toNoteNameOptions(topicId));
}

export function getDateFromFile(
  file: TFile,
  granularity: Granularity,
  shell: ObsidianAppShell,
  topicId: string = "",
): MomentLike | null {
  return getDateFromFilename(file.basename, granularity, shell, topicId);
}
