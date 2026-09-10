import { DISPLAY_MODE } from "src/ui/config/consntants";
import type { ContentView, DateFilter, DisplayMode, Granularity, TimeFilter } from "src/ui/types";

export type MFDINoteMode = "periodic" | "fixed";

interface MFDIViewCapabilities {
  supportsDateNavigation: boolean;
  supportsDisplayModeSwitch: boolean;
  supportsSidebar: boolean;
  supportsTopicSelection: boolean;
  supportsPeriodMenus: boolean;
  supportsMovePostBetweenDays: boolean;
  supportsTags: boolean;
}

export interface MFDIViewState extends Record<string, unknown> {
  displayMode: DisplayMode;
  granularity: Granularity;
  asTask: boolean;
  threadOnly: boolean;
  fixedSessionNumber: number;
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  searchQuery: string;
  activeTopic: string;
  noteMode: MFDINoteMode;
  file: string | null;
}

/**
 * Optional per-view navigation defaults applied after store hydration.
 *
 * Vault-level persistence still supplies the normal dashboard defaults, but
 * an alternate shell may need a different presentation without mutating that
 * persisted preference just by opening a second view.
 */
export interface MFDIInitialNavigationState {
  displayMode: DisplayMode;
  contentView: ContentView;
  granularity: Granularity;
  dateFilter: DateFilter;
  timeFilter: TimeFilter;
  asTask: boolean;
  threadOnly: boolean;
  activeTag: string | null;
  threadFocusRootId: string | null;
}

export const DEFAULT_MFDI_VIEW_STATE: MFDIViewState = {
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
};

export function createDefaultMFDIViewState(params?: {
  noteMode?: MFDINoteMode;
  file?: string | null;
}): MFDIViewState {
  const { noteMode = "periodic", file = null } = params ?? {};

  if (noteMode === "fixed") {
    // fixedノートの既定値をここに集約し、React側の再同期でperiodic既定値へ戻るのを防ぐ。
    return {
      ...DEFAULT_MFDI_VIEW_STATE,
      noteMode,
      file: file,
      displayMode: DISPLAY_MODE.FOCUS,
      fixedSessionNumber: 1,
      dateFilter: "all",
    };
  }

  return {
    ...DEFAULT_MFDI_VIEW_STATE,
    noteMode,
    file: null,
  };
}

/**
 * Returns the initial state for the Day One-inspired view.
 *
 * The view is an archive-style journal, so it starts with the complete
 * timeline instead of the focused "today" window used by the default view.
 */
export function createDayOneViewState(): MFDIViewState {
  return {
    ...DEFAULT_MFDI_VIEW_STATE,
    displayMode: DISPLAY_MODE.TIMELINE,
    dateFilter: "all",
    timeFilter: "all",
  };
}

export function getMFDIViewCapabilities(
  state: Pick<MFDIViewState, "noteMode">,
): MFDIViewCapabilities {
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

export function createFixedNoteViewState(filePath: string): MFDIViewState {
  return createDefaultMFDIViewState({
    noteMode: "fixed",
    file: filePath,
  });
}

export function getFixedNoteTitle(path: string | null): string {
  if (!path) return "Fixed Note";
  const segments = path.replace(/\\/g, "/").split("/");
  return segments[segments.length - 1].replace(/\.mfdi\.md$/, "") || "Fixed Note";
}
