import type { MFDIStorage } from "src/core/storage";
import type { Settings } from "src/core/domain/settings";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import type {
  ContentView,
  DateFilter,
  DisplayMode,
  Granularity,
  InputAreaSize,
  MainView,
  MomentLike,
  TimeFilter,
} from "src/features/workspace/types";
import type { MFDINoteMode } from "src/features/workspace/views/state";
import type { DraftSlice, EditorSlice } from "src/features/composer/store/types";
import type { NoteSlice } from "src/features/notes/store/types";
import type { TasksSlice } from "src/features/tasks/store/types";

export interface EnvironmentSlice {
  shell: ObsidianAppShell | null;
  storage: MFDIStorage | null;
  pluginSettings: Settings | null;
  viewNoteMode: MFDINoteMode;
  file: string | null;
  setAppDependencies: (shell: ObsidianAppShell) => void;
  setStorage: (storage: MFDIStorage) => void;
  setPluginSettings: (settings: Settings) => void;
  setViewContext: (params: {
    noteMode: MFDINoteMode;
    file: string | null;
    fixedSessionNumber?: number;
  }) => void;
  initializeAppStore: (params: {
    shell: ObsidianAppShell;
    settings: Settings;
    storage: MFDIStorage;
    initialViewState?: {
      noteMode: MFDINoteMode;
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
    date: moment.Moment;
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

export type MFDIStore = EnvironmentSlice &
  SettingsSlice &
  TasksSlice &
  NoteSlice &
  EditorSlice &
  DraftSlice;
