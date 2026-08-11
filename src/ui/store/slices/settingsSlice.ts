import { Notice } from "obsidian";
import type { Settings } from "src/settings";
import {
  CONTENT_VIEW,
  DISPLAY_MODE,
  INPUT_AREA_SIZE,
  MOVE_STEP,
  STORAGE_KEYS,
} from "src/ui/config/consntants";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/ui/config/filter-config";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import {
  getDraftMetadataStorageKey,
  getInputAreaSizeStorageKey,
  getInputStorageKey,
} from "src/ui/store/slices/inputStorage";
import type { MFDIStore, SettingsSlice } from "src/ui/store/slices/types";
import type {
  ContentView,
  DateFilter,
  DisplayMode,
  Granularity,
  InputAreaSize,
  MomentLike,
  TimeFilter,
} from "src/ui/types";
import { isTimelineView } from "src/ui/utils/view-mode";
import type { MFDINoteMode } from "src/ui/view/state";
import type { StateCreator } from "zustand/vanilla";

export const DEFAULT_VIEW_STATE = {
  displayMode: DISPLAY_MODE.TIMELINE,
  contentView: CONTENT_VIEW.TIMELINE,
  granularity: GRANULARITY_CONFIG.day.unit,
  dateFilter: DATE_FILTER_IDS.TODAY,
  timeFilter: TIME_FILTER_IDS.ALL,
  asTask: false,
  threadOnly: false,
  activeTag: null,
  threadFocusRootId: null,
} as const;

function persistValue(state: MFDIStore, key: string, value: unknown) {
  state.storage?.set(key, value);
}

export function isPastDateReadOnly(params: {
  date: MomentLike;
  granularity: Granularity;
  allowEditingPastNotes: boolean;
}) {
  const { date, granularity, allowEditingPastNotes } = params;
  if (allowEditingPastNotes) return false;
  return date.isBefore(window.moment(), GRANULARITY_CONFIG[granularity].unit);
}

export function isViewReadOnly(params: {
  date: MomentLike;
  granularity: Granularity;
  displayMode: DisplayMode;
  allowEditingPastNotes: boolean;
  noteMode?: "periodic" | "fixed";
}) {
  const { date, granularity, displayMode, allowEditingPastNotes, noteMode = "periodic" } = params;
  if (noteMode === "fixed") return false;
  if (isTimelineView(displayMode)) return false;
  return isPastDateReadOnly({ date, granularity, allowEditingPastNotes });
}

function resolveInitialSettingsState(
  settings: Settings,
  storage: MFDIStore["storage"],
  viewNoteMode: MFDINoteMode,
  file: string | null,
) {
  // 編集中投稿が復元できる場合はその粒度・日付を優先する
  const editingPost =
    storage?.get<{
      offset: number;
      granularity: string;
      noteDateStr: string;
    } | null>(STORAGE_KEYS.EDITING_POST, null) ?? null;

  const granularity =
    editingPost !== null
      ? (editingPost.granularity as Granularity)
      : (storage?.get<Granularity>(STORAGE_KEYS.GRANULARITY, GRANULARITY_CONFIG.day.unit) ??
        GRANULARITY_CONFIG.day.unit);

  const savedDate =
    editingPost !== null
      ? editingPost.noteDateStr
      : (storage?.get<string | null>(STORAGE_KEYS.DATE, null) ?? null);

  const date = savedDate ? window.moment(savedDate) : window.moment();
  const validDate = date.isValid() ? date : window.moment();
  const sidebarOpen = storage?.get<boolean>(STORAGE_KEYS.SIDEBAR_OPEN, true) ?? true;
  const leftPanelOpen =
    storage?.get<boolean>(STORAGE_KEYS.PANEL_LEFT_OPEN, sidebarOpen) ?? sidebarOpen;
  const rightPanelOpen =
    storage?.get<boolean>(STORAGE_KEYS.PANEL_RIGHT_OPEN, sidebarOpen) ?? sidebarOpen;

  return {
    activeTopic: settings.activeTopic ?? "",
    activeTag: storage?.get<string | null>(STORAGE_KEYS.ACTIVE_TAG, null) ?? null,
    fixedSessionNumber: 1,
    granularity,
    date: validDate,
    timeFilter:
      storage?.get<TimeFilter>(STORAGE_KEYS.TIME_FILTER, TIME_FILTER_IDS.ALL) ??
      TIME_FILTER_IDS.ALL,
    dateFilter:
      storage?.get<DateFilter>(STORAGE_KEYS.DATE_FILTER, DATE_FILTER_IDS.TODAY) ??
      DATE_FILTER_IDS.TODAY,
    sidebarOpen,
    leftPanelOpen,
    rightPanelOpen,
    displayMode:
      storage?.get<DisplayMode>(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.TIMELINE) ??
      (DISPLAY_MODE.TIMELINE as DisplayMode),
    contentView:
      storage?.get<ContentView>(STORAGE_KEYS.CONTENT_VIEW, CONTENT_VIEW.TIMELINE) ??
      CONTENT_VIEW.TIMELINE,
    asTask: storage?.get<boolean>(STORAGE_KEYS.AS_TASK, false) ?? false,
    threadOnly: false,
    searchQuery: "",
    threadFocusRootId: storage?.get<string | null>(STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null) ?? null,
    inputAreaSize:
      storage?.get<InputAreaSize>(
        getInputAreaSizeStorageKey(viewNoteMode, file, granularity, validDate.format("YYYY-MM-DD")),
        INPUT_AREA_SIZE.DEFAULT,
      ) ?? INPUT_AREA_SIZE.DEFAULT,
  };
}

export const createSettingsSlice: StateCreator<MFDIStore, [], [], SettingsSlice> = (set, get) => ({
  activeTopic: "",
  activeTag: null,
  fixedSessionNumber: 1,
  granularity: GRANULARITY_CONFIG.day.unit,
  date: window.moment(),
  timeFilter: TIME_FILTER_IDS.ALL,
  dateFilter: DATE_FILTER_IDS.TODAY,
  // ダッシュボードの初期状態では左右パネルを表示する。
  // 保存済みユーザー設定がある場合は resolveInitialSettingsState で優先する。
  sidebarOpen: true,
  leftPanelOpen: true,
  rightPanelOpen: true,
  displayMode: DISPLAY_MODE.TIMELINE as DisplayMode,
  contentView: CONTENT_VIEW.TIMELINE as ContentView,
  asTask: false,
  threadOnly: false,
  searchQuery: "",
  searchInputOpen: false,
  threadFocusRootId: null,
  inputAreaSize: INPUT_AREA_SIZE.DEFAULT,

  setInputAreaSize: (size) => {
    // 入力内容がある状態で最小化するのを防止
    if (size === INPUT_AREA_SIZE.MINIMIZED && get().getInputValue().trim().length > 0) {
      new Notice("編集中は最小化できません");
      return;
    }

    set({ inputAreaSize: size });
    const { storage, viewNoteMode, file, granularity, date } = get();
    storage?.set(
      getInputAreaSizeStorageKey(viewNoteMode, file, granularity, date.format("YYYY-MM-DD")),
      size,
    );
  },

  reloadInputAreaSize: () => {
    const { storage, viewNoteMode, file, granularity, date } = get();
    if (!storage) return;
    const size = storage.get<InputAreaSize>(
      getInputAreaSizeStorageKey(viewNoteMode, file, granularity, date.format("YYYY-MM-DD")),
      INPUT_AREA_SIZE.DEFAULT,
    );
    set({ inputAreaSize: size });
  },

  setActiveTopic: (activeTopic) => {
    set({ activeTopic, threadFocusRootId: null });
    persistValue(get(), STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setActiveTag: (activeTag) => {
    set({ activeTag });
    persistValue(get(), STORAGE_KEYS.ACTIVE_TAG, activeTag);
  },

  setFixedSessionNumber: (fixedSessionNumber) => {
    const {
      fixedSessionNumber: currentFixedSessionNumber,
      viewNoteMode,
      file,
      storage,
      editingPost,
      getInputValue,
      replaceInput,
      draftMetadata,
      draftMetadataBase,
    } = get();

    if (currentFixedSessionNumber === fixedSessionNumber) {
      return;
    }

    if (editingPost) {
      // 意図: 編集対象と session をまたいで混線すると submit 先が曖昧になるため、編集中の切替は止める。
      new Notice("編集中はセッションを切り替えられません");
      return;
    }

    if (storage && viewNoteMode === "fixed") {
      storage.set(
        getInputStorageKey(viewNoteMode, file, currentFixedSessionNumber),
        getInputValue(),
      );
      storage.set(getDraftMetadataStorageKey(viewNoteMode, file, currentFixedSessionNumber), {
        draftMetadata,
        draftMetadataBase,
      });
    }

    set({ fixedSessionNumber, threadFocusRootId: null });

    if (storage && viewNoteMode === "fixed") {
      const restoredInput = storage.get<string>(
        getInputStorageKey(viewNoteMode, file, fixedSessionNumber),
        "",
      );
      const restoredDraftMetadata = storage.get<{
        draftMetadata: Record<string, string>;
        draftMetadataBase: Record<string, string>;
      }>(getDraftMetadataStorageKey(viewNoteMode, file, fixedSessionNumber), {
        draftMetadata: {},
        draftMetadataBase: {},
      });

      replaceInput(restoredInput);
      set({
        draftMetadata: restoredDraftMetadata.draftMetadata,
        draftMetadataBase: restoredDraftMetadata.draftMetadataBase,
      });
    }
  },

  setGranularity: (granularity) => {
    set((state) => ({
      granularity,
      threadFocusRootId: null,
      displayMode:
        granularity !== GRANULARITY_CONFIG.day.unit ? DISPLAY_MODE.FOCUS : state.displayMode,
    }));
    const state = get();
    persistValue(state, STORAGE_KEYS.GRANULARITY, granularity);
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, state.displayMode);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setDate: (date) => {
    set({ date, threadFocusRootId: null });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, date.toISOString());
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
    get().reloadInputAreaSize();
  },

  setTimeFilter: (timeFilter) => {
    set({ timeFilter });
    persistValue(get(), STORAGE_KEYS.TIME_FILTER, timeFilter);
  },

  setDateFilter: (dateFilter) => {
    set({
      dateFilter,
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE_FILTER, dateFilter);
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },

  setSearchInputOpen: (searchInputOpen) => {
    set({ searchInputOpen });
  },

  setSidebarOpen: (sidebarOpen) => {
    set({
      sidebarOpen,
      leftPanelOpen: sidebarOpen,
      rightPanelOpen: sidebarOpen,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.SIDEBAR_OPEN, sidebarOpen);
    persistValue(state, STORAGE_KEYS.PANEL_LEFT_OPEN, sidebarOpen);
    persistValue(state, STORAGE_KEYS.PANEL_RIGHT_OPEN, sidebarOpen);
  },

  setLeftPanelOpen: (leftPanelOpen) => {
    const sidebarOpen = leftPanelOpen || get().rightPanelOpen;
    set({ leftPanelOpen, sidebarOpen });
    const state = get();
    persistValue(state, STORAGE_KEYS.PANEL_LEFT_OPEN, leftPanelOpen);
    persistValue(state, STORAGE_KEYS.SIDEBAR_OPEN, sidebarOpen);
  },

  setRightPanelOpen: (rightPanelOpen) => {
    const sidebarOpen = get().leftPanelOpen || rightPanelOpen;
    set({ rightPanelOpen, sidebarOpen });
    const state = get();
    persistValue(state, STORAGE_KEYS.PANEL_RIGHT_OPEN, rightPanelOpen);
    persistValue(state, STORAGE_KEYS.SIDEBAR_OPEN, sidebarOpen);
  },

  toggleSidebar: () => {
    const state = get();
    state.setSidebarOpen(!state.sidebarOpen);
  },

  toggleLeftPanel: () => {
    const state = get();
    state.setLeftPanelOpen(!state.leftPanelOpen);
  },

  toggleRightPanel: () => {
    const state = get();
    state.setRightPanelOpen(!state.rightPanelOpen);
  },

  setDisplayMode: (displayMode) => {
    set({ displayMode, threadFocusRootId: null });
    const state = get();
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, displayMode);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setContentView: (contentView) => {
    set({ contentView });
    persistValue(get(), STORAGE_KEYS.CONTENT_VIEW, contentView);
  },

  setAsTask: (asTask) => {
    set({ asTask });
    persistValue(get(), STORAGE_KEYS.AS_TASK, asTask);
  },

  setThreadOnly: (threadOnly) => {
    // 検索UIからの絞り込み状態を明示管理し、見た目と実際の抽出条件を常に一致させる。
    set({ threadOnly });
  },

  setThreadFocusRootId: (threadFocusRootId, focusDate) => {
    set((state) => ({
      threadFocusRootId,
      date: threadFocusRootId !== null && focusDate != null ? focusDate.clone() : state.date,
      displayMode: threadFocusRootId !== null ? DISPLAY_MODE.FOCUS : state.displayMode,
    }));
    const state = get();
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, threadFocusRootId);
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, state.displayMode);
    if (threadFocusRootId !== null && focusDate != null) {
      persistValue(state, STORAGE_KEYS.DATE, state.date.toISOString());
    }
  },

  handleClickHome: () => {
    const now = window.moment();
    // 意図: home は表示条件だけでなく検索条件も初期化し、一覧を完全に既定状態へ戻す。
    set({
      ...DEFAULT_VIEW_STATE,
      date: now,
      searchQuery: "",
      searchInputOpen: false,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DEFAULT_VIEW_STATE.displayMode);
    persistValue(state, STORAGE_KEYS.CONTENT_VIEW, DEFAULT_VIEW_STATE.contentView);
    persistValue(state, STORAGE_KEYS.GRANULARITY, DEFAULT_VIEW_STATE.granularity);
    persistValue(state, STORAGE_KEYS.DATE_FILTER, DEFAULT_VIEW_STATE.dateFilter);
    persistValue(state, STORAGE_KEYS.TIME_FILTER, DEFAULT_VIEW_STATE.timeFilter);
    persistValue(state, STORAGE_KEYS.AS_TASK, DEFAULT_VIEW_STATE.asTask);
    persistValue(state, STORAGE_KEYS.DATE, now.toISOString());
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, DEFAULT_VIEW_STATE.threadFocusRootId);
    persistValue(state, STORAGE_KEYS.ACTIVE_TAG, DEFAULT_VIEW_STATE.activeTag);
  },

  handleClickToday: () => {
    const now = window.moment();
    set({
      date: now,
      displayMode: DISPLAY_MODE.TIMELINE,
      threadFocusRootId: null,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, now.toISOString());
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.TIMELINE);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
    get().reloadInputAreaSize();
  },

  getMoveStep: () => {
    const { displayMode, granularity, dateFilter } = get();
    if (isTimelineView(displayMode)) return MOVE_STEP.DEFAULT;
    if (granularity !== GRANULARITY_CONFIG.day.unit) return MOVE_STEP.DEFAULT;
    if (dateFilter === DATE_FILTER_IDS.THIS_WEEK) return MOVE_STEP.WEEK;
    const days = Number.parseInt(dateFilter, 10);
    return Number.isNaN(days) ? MOVE_STEP.DEFAULT : days;
  },

  handleClickMovePrevious: () => {
    const { date, granularity, dateFilter, getMoveStep } = get();
    const step = getMoveStep();
    const unit =
      dateFilter === DATE_FILTER_IDS.THIS_MONTH
        ? "month"
        : dateFilter === DATE_FILTER_IDS.THIS_YEAR
          ? "year"
          : GRANULARITY_CONFIG[granularity].unit;
    const nextDate = date.clone().subtract(step, unit);
    set({
      date: nextDate,
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, nextDate.toISOString());
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
    get().reloadInputAreaSize();
  },

  handleClickMoveNext: () => {
    const { date, granularity, dateFilter, getMoveStep } = get();
    const step = getMoveStep();
    const unit =
      dateFilter === DATE_FILTER_IDS.THIS_MONTH
        ? "month"
        : dateFilter === DATE_FILTER_IDS.THIS_YEAR
          ? "year"
          : GRANULARITY_CONFIG[granularity].unit;
    const nextDate = date.clone().add(step, unit);
    set({
      date: nextDate,
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, nextDate.toISOString());
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
    get().reloadInputAreaSize();
  },

  handleChangeCalendarDate: (value) => {
    const { granularity } = get();
    const nextDate = GRANULARITY_CONFIG[granularity].parseInput(value);
    set({
      date: nextDate,
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.DATE, nextDate.toISOString());
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
    get().reloadInputAreaSize();
  },

  isToday: () => {
    const { date, granularity } = get();
    return date.isSame(window.moment(), GRANULARITY_CONFIG[granularity].unit);
  },

  isReadOnly: () => {
    const { date, granularity, displayMode, pluginSettings, viewNoteMode } = get();
    return isViewReadOnly({
      date,
      granularity,
      displayMode,
      allowEditingPastNotes: pluginSettings?.allowEditingPastNotes ?? false,
      noteMode: viewNoteMode,
    });
  },

  isDateReadOnly: (date, granularity) => {
    const { granularity: activeGranularity, pluginSettings, displayMode, viewNoteMode } = get();
    return isViewReadOnly({
      date,
      granularity: granularity ?? activeGranularity,
      displayMode,
      allowEditingPastNotes: pluginSettings?.allowEditingPastNotes ?? false,
      noteMode: viewNoteMode,
    });
  },

  getEffectiveDate: () => {
    const { date, displayMode } = get();
    return isTimelineView(displayMode) ? window.moment() : date;
  },

  hydrateSettingsState: () => {
    const { pluginSettings, storage, viewNoteMode, file } = get();
    if (!pluginSettings || !storage) return;
    set(resolveInitialSettingsState(pluginSettings, storage, viewNoteMode, file));
  },
});
