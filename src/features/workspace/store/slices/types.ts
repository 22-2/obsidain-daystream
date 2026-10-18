import type { Moment } from "moment";
import type { DateSelection } from "src/features/workspace/utils/date-selection";
import type { DSTRStorage } from "src/core/storage";
import type { Settings } from "src/core/domain/settings";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import type { Granularity } from "src/core/domain/granularity";
import type { MomentLike } from "src/core/domain/post";
import type { ContentView, DateFilter, DisplayMode, InputAreaSize, MainView, TimeFilter } from "src/features/workspace/types";
import type { DSTRNoteMode } from "src/features/workspace/views/state";
import type { DraftSlice, EditorSlice } from "src/features/composer/store/types";
import type { NoteSlice } from "src/features/notes/store/types";
import type { TasksSlice } from "src/features/tasks/store/types";

export interface EnvironmentSlice {
  shell: ObsidianAppShell | null;
  storage: DSTRStorage | null;
  pluginSettings: Settings | null;
  viewNoteMode: DSTRNoteMode;
  file: string | null;
  setAppDependencies: (shell: ObsidianAppShell) => void;
  setStorage: (storage: DSTRStorage) => void;
  setPluginSettings: (settings: Settings) => void;
  setViewContext: (params: {
    noteMode: DSTRNoteMode;
    file: string | null;
    fixedSessionNumber?: number;
  }) => void;
  initializeAppStore: (params: {
    shell: ObsidianAppShell;
    settings: Settings;
    storage: DSTRStorage;
    initialViewState?: {
      noteMode: DSTRNoteMode;
      file: string | null;
      fixedSessionNumber: number;
      mainView?: MainView;
    };
  }) => void;
}

export interface NavigationSlice {
  activeTopic: string;
  activeTag: string | null;
  fixedSessionNumber: number;
  granularity: Granularity;
  date: MomentLike;
  dateSelection: DateSelection | null;
  setDateSelection: (selection: DateSelection) => void;
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  displayMode: DisplayMode;
  contentView: ContentView;
  mainView: MainView;
  searchReturnState: Pick<
    NavigationSlice,
    | "mainView"
    | "contentView"
    | "displayMode"
    | "asTask"
    | "threadFocusRootId"
    | "date"
    | "dateSelection"
    | "granularity"
    | "dateFilter"
    | "timeFilter"
    | "activeTag"
  > | null;
  asTask: boolean;
  threadOnly: boolean;
  threadFocusRootId: string | null;
  setActiveTopic: (topicId: string) => void;
  setActiveTag: (tag: string | null) => void;
  setFixedSessionNumber: (sessionNumber: number) => void;
  setGranularity: (g: Granularity) => void;
  setCalendarSelection: (selection: {
    date: Moment;
    dateFilter: DateFilter;
    granularity?: Granularity;
  }) => void;
  setDate: (d: MomentLike) => void;
  setTimeFilter: (f: TimeFilter) => void;
  setDateFilter: (f: DateFilter) => void;
  setDisplayMode: (m: DisplayMode) => void;
  setContentView: (view: ContentView) => void;
  setMainView: (view: MainView) => void;
  closeSearch: () => void;
  setAsTask: (asTask: boolean) => void;
  setThreadOnly: (threadOnly: boolean) => void;
  setThreadFocusRootId: (rootId: string | null, focusDate?: MomentLike) => void;
  handleClickHome: () => void;
  handleClickToday: () => void;
  handleClickMovePrevious: () => void;
  handleClickMoveNext: () => void;
  handleChangeCalendarDate: (value: string) => void;
  isToday: () => boolean;
  isReadOnly: () => boolean;
  isDateReadOnly: (date: MomentLike, granularity?: Granularity) => boolean;
  getMoveStep: () => number;
  getEffectiveDate: () => MomentLike;
}

export interface LayoutSlice {
  sidebarOpen: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  searchQuery: string;
  searchInputOpen: boolean;
  inputAreaSize: InputAreaSize;
  setInputAreaSize: (size: InputAreaSize) => void;
  reloadInputAreaSize: () => void;
  setSearchQuery: (q: string) => void;
  setSearchInputOpen: (open: boolean) => void;
  setSidebarOpen: (o: boolean) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

export interface SettingsSlice extends NavigationSlice, LayoutSlice {
  hydrateSettingsState: () => void;
}

export type DSTRStore = EnvironmentSlice &
  SettingsSlice &
  TasksSlice &
  NoteSlice &
  EditorSlice &
  DraftSlice;
