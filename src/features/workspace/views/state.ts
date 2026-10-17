import { DISPLAY_MODE, MAIN_VIEW } from "src/features/workspace/config/constants";
import type { Granularity } from "src/core/domain/granularity";
import type { DateFilter, DisplayMode, MainView, TimeFilter } from "src/features/workspace/types";
import type { DSTRNoteMode } from "src/core/domain/note-mode";
import { FILENAME_SUFFIX } from "src/core/fixed-note";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";

export type { DSTRNoteMode } from "src/core/domain/note-mode";

interface DSTRViewCapabilities {
  supportsDateNavigation: boolean;
  supportsDisplayModeSwitch: boolean;
  supportsSidebar: boolean;
  supportsTopicSelection: boolean;
  supportsPeriodMenus: boolean;
  supportsMovePostBetweenDays: boolean;
  supportsTags: boolean;
}

export interface DSTRViewState extends Record<string, unknown> {
  displayMode: DisplayMode;
  granularity: Granularity;
  asTask: boolean;
  threadOnly: boolean;
  fixedSessionNumber: number;
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  searchQuery: string;
  activeTopic: string;
  noteMode: DSTRNoteMode;
  file: string | null;
  // タブ選択は vault 全体ではなく、Obsidian の各 view state に保存する。
  mainView?: MainView;
}

export const DEFAULT_DSTR_VIEW_STATE: DSTRViewState = {
  displayMode: DISPLAY_MODE.FOCUS,
  granularity: "day",
  asTask: false,
  threadOnly: false,
  fixedSessionNumber: 1,
  timeFilter: "all",
  dateFilter: "today",
  searchQuery: "",
  activeTopic: "",
  noteMode: "periodic",
  file: null,
  mainView: MAIN_VIEW.TIMELINE,
};

export function createDefaultDSTRViewState(params?: {
  noteMode?: DSTRNoteMode;
  file?: string | null;
}): DSTRViewState {
  const { noteMode = "periodic", file = null } = params ?? {};

  if (noteMode === "fixed") {
    // fixedノートの既定値をここに集約し、React側の再同期でperiodic既定値へ戻るのを防ぐ。
    return {
      ...DEFAULT_DSTR_VIEW_STATE,
      noteMode,
      file: file,
      displayMode: DISPLAY_MODE.FOCUS,
      fixedSessionNumber: 1,
      dateFilter: "all",
    };
  }

  return {
    ...DEFAULT_DSTR_VIEW_STATE,
    noteMode,
    file: null,
  };
}

export function getDSTRViewCapabilities(
  state: Pick<DSTRViewState, "noteMode">,
): DSTRViewCapabilities {
  if (state.noteMode === "fixed") {
    return {
      supportsDateNavigation: false,
      supportsDisplayModeSwitch: false,
      supportsSidebar: true,
      supportsTopicSelection: false,
      supportsPeriodMenus: true,
      supportsMovePostBetweenDays: false,
      supportsTags: false,
    };
  }

  return {
    supportsDateNavigation: true,
    supportsDisplayModeSwitch: true,
    supportsSidebar: true,
    supportsTopicSelection: true,
    supportsPeriodMenus: true,
    supportsMovePostBetweenDays: true,
    supportsTags: true,
  };
}

export function createFixedNoteViewState(filePath: string): DSTRViewState {
  return createDefaultDSTRViewState({
    noteMode: "fixed",
    file: filePath,
  });
}

export function getFixedNoteTitle(path: string | null): string {
  if (!path) return "Fixed Note";
  const segments = path.replace(/\\/g, "/").split("/");
  const filename = segments[segments.length - 1];
  const suffix = [FILENAME_SUFFIX, LEGACY_DAYSTREAM_IDENTIFIERS.fixedNoteSuffix].find((value) =>
    filename.toLowerCase().endsWith(value),
  );
  return (suffix ? filename.slice(0, -suffix.length) : filename) || "Fixed Note";
}
