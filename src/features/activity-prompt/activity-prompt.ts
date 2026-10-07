import type { TFile } from "obsidian";
import { resolveNoteSource } from "src/core/note-source";
import { toText } from "src/core/post-utils";
import { indexNoteContent } from "src/core/db/indexer/tag-indexer";
import type { Settings } from "src/core/domain/settings";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import type { MomentLike } from "src/core/domain/post";

export interface ActivityPromptSaveResult {
  notePath: string;
  indexError: unknown | null;
}

interface SaveActivityPromptResponseOptions {
  shell: ObsidianAppShell;
  settings: Settings;
  input: string;
  now?: MomentLike;
}

async function resolveOrCreateDailyNote(
  shell: ObsidianAppShell,
  settings: Settings,
  now: MomentLike,
): Promise<TFile> {
  const noteSource = resolveNoteSource({
    shell,
    date: now,
    granularity: "day",
    activeTopic: settings.activeTopic,
    noteMode: "periodic",
    file: null,
  });

  const existingNote = noteSource.resolveCurrentNote();
  if (existingNote) return existingNote;

  try {
    const createdNote = await noteSource.ensureCurrentNote();
    if (createdNote) return createdNote;
  } catch (error) {
    // 同時に別経路から今日のノートが作成された場合は、作成失敗後に再解決する。
    const concurrentlyCreatedNote = noteSource.resolveCurrentNote();
    if (concurrentlyCreatedNote) return concurrentlyCreatedNote;
    throw error;
  }

  throw new Error("投稿先の日次ノートを作成できませんでした");
}

export async function saveActivityPromptResponse({
  shell,
  settings,
  input,
  now = window.moment(),
}: SaveActivityPromptResponseOptions): Promise<ActivityPromptSaveResult> {
  const text = toText(input, false, "day", now);
  if (!text) {
    throw new Error("空の活動記録は保存できません");
  }

  const note = await resolveOrCreateDailyNote(shell, settings, now);
  const newContent = await shell.insertTextAfterEnsuringMarker(note, text, settings.insertAfter);

  let indexError: unknown | null = null;
  try {
    await indexNoteContent(shell, note, settings, newContent);
  } catch (error) {
    // Markdown への保存は完了しているため、再送による重複を避けて成功扱いにする。
    indexError = error;
  }

  shell.trigger("mfdi:scroll-to-top");
  return { notePath: note.path, indexError };
}
