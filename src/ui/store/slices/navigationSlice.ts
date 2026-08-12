import { Notice } from "obsidian";
import { CONTENT_VIEW, DISPLAY_MODE, MOVE_STEP } from "src/ui/config/consntants";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/ui/config/filter-config";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { DEFAULT_VIEW_STATE } from "src/ui/store/slices/settingsDefaults";
import {
  persistFixedSessionDraft,
  persistNavigationState,
  restoreFixedSessionDraft,
} from "src/ui/store/slices/settingsPersistence";
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
    persistNavigationState(get(), { threadFocusRootId: null });
  },

  setActiveTag: (activeTag) => {
    set({ activeTag });
    persistNavigationState(get(), { activeTag });
  },

  setFixedSessionNumber: (fixedSessionNumber) => {
    const {
      fixedSessionNumber: currentFixedSessionNumber,
      viewNoteMode,
      file,
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

    persistFixedSessionDraft(
      { storage: get().storage, viewNoteMode, file },
      currentFixedSessionNumber,
      {
        input: getInputValue(),
        draftMetadata,
        draftMetadataBase,
      },
    );

    set({ fixedSessionNumber, threadFocusRootId: null });

    const restoredDraft = restoreFixedSessionDraft(
      { storage: get().storage, viewNoteMode, file },
      fixedSessionNumber,
    );
    if (get().storage && viewNoteMode === "fixed") {
      replaceInput(restoredDraft.input);
      set({
        draftMetadata: restoredDraft.draftMetadata,
        draftMetadataBase: restoredDraft.draftMetadataBase,
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
    persistNavigationState(state, {
      granularity,
      displayMode: state.displayMode,
      threadFocusRootId: null,
    });
  },

  setDate: (date) => {
    set({ date, threadFocusRootId: null });
    const state = get();
    persistNavigationState(state, { date, threadFocusRootId: null });
    state.reloadInputAreaSize();
  },

  setTimeFilter: (timeFilter: TimeFilter) => {
    set({ timeFilter });
    persistNavigationState(get(), { timeFilter });
  },

  setDateFilter: (dateFilter: DateFilter) => {
    set({
      dateFilter,
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
    const state = get();
    persistNavigationState(state, {
      dateFilter,
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
  },

  setDisplayMode: (displayMode: DisplayMode) => {
    set({ displayMode, threadFocusRootId: null });
    persistNavigationState(get(), { displayMode, threadFocusRootId: null });
  },

  setContentView: (contentView: ContentView) => {
    set({ contentView });
    persistNavigationState(get(), { contentView });
  },

  setAsTask: (asTask: boolean) => {
    set({ asTask });
    persistNavigationState(get(), { asTask });
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
    persistNavigationState(state, {
      threadFocusRootId,
      displayMode: state.displayMode,
      ...(threadFocusRootId !== null && focusDate != null ? { date: state.date } : {}),
    });
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
    persistNavigationState(state, {
      displayMode: DEFAULT_VIEW_STATE.displayMode,
      contentView: DEFAULT_VIEW_STATE.contentView,
      granularity: DEFAULT_VIEW_STATE.granularity,
      dateFilter: DEFAULT_VIEW_STATE.dateFilter,
      timeFilter: DEFAULT_VIEW_STATE.timeFilter,
      asTask: DEFAULT_VIEW_STATE.asTask,
      date: now,
      threadFocusRootId: DEFAULT_VIEW_STATE.threadFocusRootId,
      activeTag: DEFAULT_VIEW_STATE.activeTag,
    });
  },

  handleClickToday: () => {
    const now = window.moment();
    set({
      date: now,
      displayMode: DISPLAY_MODE.TIMELINE,
      threadFocusRootId: null,
    });
    const state = get();
    persistNavigationState(state, {
      date: now,
      displayMode: DISPLAY_MODE.TIMELINE,
      threadFocusRootId: null,
    });
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
    persistNavigationState(state, {
      date: nextDate,
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: null,
    });
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
  persistNavigationState(state, {
    date: nextDate,
    displayMode: DISPLAY_MODE.FOCUS,
    threadFocusRootId: null,
  });
  state.reloadInputAreaSize();
}
