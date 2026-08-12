import { Notice } from "obsidian";
import { CONTENT_VIEW, DISPLAY_MODE, MOVE_STEP, STORAGE_KEYS } from "src/ui/config/consntants";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/ui/config/filter-config";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import {
  getDraftMetadataStorageKey,
  getInputStorageKey,
} from "src/ui/store/slices/inputStorage";
import { DEFAULT_VIEW_STATE } from "src/ui/store/slices/settingsDefaults";
import { persistValue } from "src/ui/store/slices/settingsPersistence";
import { isPastDateReadOnly, isViewReadOnly } from "src/ui/store/slices/settingsPredicates";
import type { MFDIStore, NavigationSlice } from "src/ui/store/slices/types";
import type {
  ContentView,
  DateFilter,
  DisplayMode,
  Granularity,
  MomentLike,
  TimeFilter,
} from "src/ui/types";
import { isTimelineView } from "src/ui/utils/view-mode";
import type { StateCreator } from "zustand/vanilla";

export const createNavigationSlice: StateCreator<MFDIStore, [], [], NavigationSlice> = (set, get) => ({
  activeTopic: "",
  activeTag: null,
  fixedSessionNumber: 1,
  granularity: GRANULARITY_CONFIG.day.unit,
  date: window.moment(),
  timeFilter: TIME_FILTER_IDS.ALL,
  dateFilter: DATE_FILTER_IDS.TODAY,
  displayMode: DISPLAY_MODE.TIMELINE as DisplayMode,
  contentView: CONTENT_VIEW.TIMELINE as ContentView,
  asTask: false,
  threadOnly: false,
  threadFocusRootId: null,

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
    state.reloadInputAreaSize();
  },

  setTimeFilter: (timeFilter: TimeFilter) => {
    set({ timeFilter });
    persistValue(get(), STORAGE_KEYS.TIME_FILTER, timeFilter);
  },

  setDateFilter: (dateFilter: DateFilter) => {
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

  setDisplayMode: (displayMode: DisplayMode) => {
    set({ displayMode, threadFocusRootId: null });
    const state = get();
    persistValue(state, STORAGE_KEYS.DISPLAY_MODE, displayMode);
    persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  },

  setContentView: (contentView: ContentView) => {
    set({ contentView });
    persistValue(get(), STORAGE_KEYS.CONTENT_VIEW, contentView);
  },

  setAsTask: (asTask: boolean) => {
    set({ asTask });
    persistValue(get(), STORAGE_KEYS.AS_TASK, asTask);
  },

  setThreadOnly: (threadOnly: boolean) => {
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
    state.reloadInputAreaSize();
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
    moveDate(get, set, "subtract");
  },

  handleClickMoveNext: () => {
    moveDate(get, set, "add");
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
    state.reloadInputAreaSize();
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
});

function moveDate(
  get: () => MFDIStore,
  set: (partial: Partial<MFDIStore> | ((state: MFDIStore) => Partial<MFDIStore>)) => void,
  direction: "add" | "subtract",
) {
  const { date, dateFilter, granularity, getMoveStep } = get();
  const step = getMoveStep();
  const unit =
    dateFilter === DATE_FILTER_IDS.THIS_MONTH
      ? "month"
      : dateFilter === DATE_FILTER_IDS.THIS_YEAR
        ? "year"
        : GRANULARITY_CONFIG[granularity].unit;
  const nextDate = date.clone()[direction](step, unit);
  set({
    date: nextDate,
    displayMode: DISPLAY_MODE.FOCUS,
    threadFocusRootId: null,
  });
  const state = get();
  persistValue(state, STORAGE_KEYS.DATE, nextDate.toISOString());
  persistValue(state, STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.FOCUS);
  persistValue(state, STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null);
  state.reloadInputAreaSize();
}
