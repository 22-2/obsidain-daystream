import { obsidianMoment } from "src/core/platform/obsidian-globals";
import type { TFile } from "obsidian";
import {
  buildFixedNotePathFromName,
  createNewFixedNote,
  ensureFixedNote,
  normalizeFixedNotePath,
  resolveFixedNote,
} from "src/core/fixed-note";
import {
  createTopicNote,
  getAllTopicNotes,
  getDateFromFile,
  getDateUID,
  getTopicNote,
  resolveTopicNotePath,
} from "src/core/platform/daily-notes";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import type { Granularity } from "src/core/domain/granularity";
import type { MomentLike } from "src/core/domain/post";
import type { DSTRNoteMode } from "src/core/domain/note-mode";

interface NoteSourceContext {
  shell: ObsidianAppShell;
  date: MomentLike;
  granularity: Granularity;
  activeTopic: string;
  noteMode: DSTRNoteMode;
  file: string | null;
}

interface NoteSource {
  mode: DSTRNoteMode;
  resolveCurrentNote: () => TFile | null;
  ensureCurrentNote: () => Promise<TFile | null>;
  matchesPath: (filePath: string, currentNote?: TFile | null) => boolean;
}

interface PeriodicNoteEntry {
  file: TFile;
  dayDate: MomentLike;
}

interface PeriodicNoteWindow {
  entries: PeriodicNoteEntry[];
  hasMore: boolean;
  lastSearchedDate: MomentLike;
}

export function resolvePeriodicNote(
  shell: ObsidianAppShell,
  date: MomentLike,
  granularity: Granularity,
  activeTopic: string,
): TFile | null {
  return getTopicNote(shell, date, granularity, activeTopic);
}

async function ensurePeriodicNote(
  shell: ObsidianAppShell,
  date: MomentLike,
  granularity: Granularity,
  activeTopic: string,
): Promise<TFile> {
  return createTopicNote(shell, date, granularity, activeTopic);
}

export function listPeriodicNotes(
  shell: ObsidianAppShell,
  granularity: Granularity,
  activeTopic: string = "",
): Record<string, TFile> {
  return getAllTopicNotes(shell, granularity, activeTopic);
}

function getPeriodicNoteKey(date: MomentLike, granularity: Granularity): string {
  return getDateUID(date, granularity);
}

export function getPeriodicNoteDate(
  file: TFile,
  granularity: Granularity,
  shell: ObsidianAppShell,
  activeTopic?: string,
) {
  return getDateFromFile(file, granularity, shell, activeTopic);
}

export function collectPeriodicNoteEntries(
  shell: ObsidianAppShell,
  granularity: Granularity,
  activeTopic: string,
  dates: MomentLike[],
): PeriodicNoteEntry[] {
  return dates
    .map((dayDate) => ({
      file: resolvePeriodicNote(shell, dayDate, granularity, activeTopic),
      dayDate,
    }))
    .filter((entry): entry is PeriodicNoteEntry => entry.file !== null);
}

export function searchPeriodicDayWindow(params: {
  shell: ObsidianAppShell;
  activeTopic: string;
  baseDate: MomentLike;
  days: number;
}): PeriodicNoteWindow {
  const { shell, activeTopic, baseDate, days } = params;
  const allTopicNotes = listPeriodicNotes(shell, "day", activeTopic);
  const uids = Object.keys(allTopicNotes).toSorted();

  if (uids.length === 0) {
    return {
      entries: [],
      hasMore: false,
      lastSearchedDate: baseDate,
    };
  }

  const oldestPossibleDate = obsidianMoment(uids[0].substring("day-".length));
  const start = baseDate.clone().startOf("day");
  const dates = Array.from({ length: days }, (_, index) => start.clone().subtract(index, "days"));
  const lastInWindow = dates[dates.length - 1];
  const entries = dates
    .map((dayDate) => ({
      file: allTopicNotes[getPeriodicNoteKey(dayDate, "day")] ?? null,
      dayDate,
    }))
    .filter((entry): entry is PeriodicNoteEntry => entry.file !== null);

  if (entries.length === 0 && lastInWindow.isAfter(oldestPossibleDate)) {
    const lastUid = getPeriodicNoteKey(lastInWindow, "day");
    const nextUid = uids
      .slice()
      .reverse()
      .find((uid) => uid < lastUid);
    if (nextUid) {
      // 空白期間をまたいでもタイムライン取得が止まらないよう、次に存在する日付へ飛ぶ。
      return searchPeriodicDayWindow({
        shell,
        activeTopic,
        baseDate: obsidianMoment(nextUid.substring("day-".length)),
        days,
      });
    }
  }

  return {
    entries,
    hasMore: lastInWindow.isAfter(oldestPossibleDate),
    lastSearchedDate: lastInWindow,
  };
}

export async function createFixedNoteFromInput(
  shell: ObsidianAppShell,
  folder: string,
  name: string,
): Promise<TFile> {
  // fixed note 作成の入口を core に寄せて、main から util の手順知識を剥がす。
  const trimmedName = name.trim();
  if (!trimmedName) {
    return createNewFixedNote(shell, folder);
  }

  const path = buildFixedNotePathFromName(folder, trimmedName, shell);
  return ensureFixedNote(shell, path);
}

function createFixedNoteSource(context: NoteSourceContext): NoteSource {
  return {
    mode: "fixed",
    resolveCurrentNote: () => resolveFixedNote(context.shell, context.file),
    ensureCurrentNote: async () => {
      if (!context.file) return null;
      return ensureFixedNote(context.shell, context.file);
    },
    matchesPath: (filePath, currentNote) => {
      const targetPath = currentNote?.path ?? normalizeFixedNotePath(context.file ?? "");
      return !!targetPath && filePath === targetPath;
    },
  };
}

function createPeriodicNoteSource(context: NoteSourceContext): NoteSource {
  return {
    mode: "periodic",
    resolveCurrentNote: () =>
      resolvePeriodicNote(context.shell, context.date, context.granularity, context.activeTopic),
    ensureCurrentNote: async () =>
      ensurePeriodicNote(context.shell, context.date, context.granularity, context.activeTopic),
    matchesPath: (filePath) =>
      filePath ===
      resolveTopicNotePath(context.date, context.granularity, context.activeTopic, context.shell),
  };
}

export function resolveNoteSource(context: NoteSourceContext): NoteSource {
  // note mode ごとの分岐を呼び出し側へ散らさず、最小契約の背後に閉じ込める。
  return context.noteMode === "fixed"
    ? createFixedNoteSource(context)
    : createPeriodicNoteSource(context);
}
