import type { TFile } from "obsidian";
import type { MFDIStorage } from "src/core/storage";
import type { Task } from "src/core/task-text";
import type { Settings } from "src/settings";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import type {
  DateFilter,
  DisplayMode,
  Draft,
  Granularity,
  InputAreaSize,
  MomentLike,
  Post,
  TimeFilter,
} from "src/ui/types";
import type { MFDINoteMode } from "src/ui/view/state";

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
    };
  }) => void;
}

export interface SettingsSlice {
  activeTopic: string;
  activeTag: string | null;
  fixedSessionNumber: number;
  granularity: Granularity;
  date: MomentLike;
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  sidebarOpen: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  displayMode: DisplayMode;
  asTask: boolean;
  threadOnly: boolean;
  searchQuery: string;
  searchInputOpen: boolean;
  threadFocusRootId: string | null;
  inputAreaSize: InputAreaSize;
  setInputAreaSize: (size: InputAreaSize) => void;
  setActiveTopic: (topicId: string) => void;
  setActiveTag: (tag: string | null) => void;
  setFixedSessionNumber: (sessionNumber: number) => void;
  setGranularity: (g: Granularity) => void;
  setDate: (d: MomentLike) => void;
  setTimeFilter: (f: TimeFilter) => void;
  setDateFilter: (f: DateFilter) => void;
  setSearchQuery: (q: string) => void;
  setSearchInputOpen: (open: boolean) => void;
  setSidebarOpen: (o: boolean) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setDisplayMode: (m: DisplayMode) => void;
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
  hydrateSettingsState: () => void;
  reloadInputAreaSize: () => void;
}

export interface PostsSlice {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  updateTasks: (note: TFile) => Promise<void>;
}

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
  handleClickOpenDailyNote: (
    shell: ObsidianAppShell,
    settings: Settings,
  ) => Promise<void>;
  openDailyNoteForDate: (
    shell: ObsidianAppShell,
    settings: Settings,
    targetDate: MomentLike,
  ) => Promise<void>;
  handleChangeTopic: (topicId: string) => void;
}

export interface EditorSlice {
  inputSnapshot: string;
  inputSnapshotVersion: number;
  draftMetadata: Record<string, string>;
  draftMetadataBase: Record<string, string>;
  editingPost: Post | null;
  editingPostOffset: number | null;
  highlightedPost: Post | null;
  highlightRequestId: number;
  syncInputSession: (v: string) => void;
  replaceInput: (v: string) => void;
  clearInput: () => void;
  setDraftMetadata: (metadata: Record<string, string>) => void;
  setDraftMetadataBase: (metadata: Record<string, string>) => void;
  getInputValue: () => string;
  setEditingPost: (post: Post | null) => void;
  setHighlightedPost: (post: Post | null) => void;
  clearHighlightedPost: () => void;
  startEdit: (post: Post) => void;
  cancelEdit: () => void;
  getEditingPost: (posts: Post[]) => Post | null;
  canSubmit: (posts: Post[], currentValue?: string) => boolean;
  hydrateEditorState: () => void;
}

export interface DraftSlice {
  drafts: Draft[];
  addDraft: (content: string) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
  hydrateDraftState: () => void;
}

export type MFDIStore = EnvironmentSlice &
  SettingsSlice &
  PostsSlice &
  NoteSlice &
  EditorSlice &
  DraftSlice;
