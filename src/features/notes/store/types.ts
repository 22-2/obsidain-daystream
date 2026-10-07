import type { TFile } from "obsidian";
import type { Settings } from "src/core/domain/settings";
import type { MomentLike } from "src/core/domain/post";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";

/** 意図: ノート機能が所有する状態・操作の型をworkspaceから切り離す。 */
export interface NoteSlice {
  currentDailyNote: TFile | null;
  weekNotePaths: Set<string>;
  setCurrentDailyNote: (note: TFile | null) => void;
  updateCurrentDailyNote: (shell: ObsidianAppShell) => void;
  replacePaths: (paths: Set<string>) => void;
  addPaths: (paths: Set<string>) => void;
  clearPaths: () => void;
  createNoteWithInsertAfter: (
    shell: ObsidianAppShell,
    settings: Settings,
    targetDate?: MomentLike,
    options?: { ensureInsertAfter?: boolean },
  ) => Promise<TFile | null>;
  handleClickOpenDailyNote: (shell: ObsidianAppShell, settings: Settings) => Promise<void>;
  openDailyNoteForDate: (
    shell: ObsidianAppShell,
    settings: Settings,
    targetDate: MomentLike,
  ) => Promise<void>;
  handleChangeTopic: (topicId: string) => void;
}
