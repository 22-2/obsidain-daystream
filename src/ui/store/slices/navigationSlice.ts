import { Notice } from "obsidian";
import { CONTENT_VIEW, DISPLAY_MODE, MAIN_VIEW, MOVE_STEP } from "src/ui/config/consntants";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/ui/config/filter-config";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { DEFAULT_VIEW_STATE } from "src/ui/store/slices/settingsDefaults";
import {
  persistFixedSessionDraft,
  persistNavigationState,
  restoreFixedSessionDraft,
  type PersistedNavigationState,
} from "src/ui/store/slices/settingsPersistence";
import { isViewReadOnly } from "src/ui/store/slices/settingsPredicates";
import type { MFDIStore, NavigationSlice } from "src/ui/store/slices/types";
import type { ContentView, DateFilter, DisplayMode, MainView, TimeFilter } from "src/ui/types";
import { resolveMainViewCompatibilityState } from "src/ui/utils/main-view-state";
import { isTimelineView } from "src/ui/utils/view-mode";
import type { StateCreator } from "zustand/vanilla";

export const createNavigationSlice: StateCreator<MFDIStore, [], [], NavigationSlice> = (
  set,
  get,
) => ({
  activeTopic: "",
  activeTag: null,
  fixedSessionNumber: 1,
  granularity: GRANULARITY_CONFIG.day.unit,
  date: window.moment(),
  timeFilter: TIME_FILTER_IDS.ALL,
  dateFilter: DATE_FILTER_IDS.TODAY,
  displayMode: DISPLAY_MODE.TIMELINE as DisplayMode,
  contentView: CONTENT_VIEW.TIMELINE as ContentView,
  mainView: MAIN_VIEW.TIMELINE as MainView,
  searchReturnState: null,
  asTask: false,
  threadOnly: false,
  threadFocusRootId: null,

  setActiveTopic: (activeTopic) => {
    set({ activeTopic, threadFocusRootId: null });
    persistNavigationState(get(), { threadFocusRootId: null });
  },

  setActiveTag: (activeTag) => {
    applyNavigationPatch(get, set, { activeTag });
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
      ...(granularity !== GRANULARITY_CONFIG.day.unit
        ? {
            mainView: MAIN_VIEW.DATE,
            contentView: CONTENT_VIEW.TIMELINE,
            asTask: false,
          }
        : {}),
      displayMode:
        granularity !== GRANULARITY_CONFIG.day.unit ? DISPLAY_MODE.FOCUS : state.displayMode,
    }));
    const state = get();
    persistNavigationState(state, {
      granularity,
      displayMode: state.displayMode,
      mainView: state.mainView,
      contentView: state.contentView,
      asTask: state.asTask,
      threadFocusRootId: null,
    });
  },

  setCalendarSelection: ({ date, dateFilter, granularity }) => {
    const current = get();
    const nextGranularity = granularity ?? current.granularity;
    const nextDate = date.clone();

    // 意図: 日付ナビゲーターの選択は関連状態を一度に保存し、中間状態の表示と多重保存を避ける。
    const state = applyNavigationPatch(get, set, {
      date: nextDate,
      dateFilter,
      granularity: nextGranularity,
      displayMode: DISPLAY_MODE.FOCUS,
      contentView: CONTENT_VIEW.TIMELINE,
      mainView: MAIN_VIEW.DATE,
      asTask: false,
      threadFocusRootId: null,
    });
    state.reloadInputAreaSize();
  },

  setDate: (date) => {
    const state = applyNavigationPatch(get, set, { date, threadFocusRootId: null });
    state.reloadInputAreaSize();
  },

  setTimeFilter: (timeFilter: TimeFilter) => {
    applyNavigationPatch(get, set, { timeFilter });
  },

  setDateFilter: (dateFilter: DateFilter) => {
    applyNavigationPatch(get, set, {
      dateFilter,
      displayMode: DISPLAY_MODE.FOCUS,
      contentView: CONTENT_VIEW.TIMELINE,
      mainView: MAIN_VIEW.DATE,
      asTask: false,
      threadFocusRootId: null,
    });
  },

  setDisplayMode: (displayMode: DisplayMode) => {
    const mainView = displayMode === DISPLAY_MODE.TIMELINE ? MAIN_VIEW.TIMELINE : MAIN_VIEW.DATE;
    // 意図: Obsidian コマンドなど旧 API からの切替も、上部タブの選択状態と同期させる。
    applyNavigationPatch(get, set, {
      displayMode,
      contentView: CONTENT_VIEW.TIMELINE,
      mainView,
      asTask: false,
      threadFocusRootId: null,
    });
  },

  setContentView: (contentView: ContentView) => {
    const state = get();
    const mainView =
      contentView === CONTENT_VIEW.INSIGHTS
        ? MAIN_VIEW.INSIGHTS
        : state.asTask
          ? MAIN_VIEW.TASKS
          : state.displayMode === DISPLAY_MODE.FOCUS
            ? MAIN_VIEW.DATE
            : MAIN_VIEW.TIMELINE;
    applyNavigationPatch(get, set, { contentView, mainView });
  },

  setMainView: (mainView: MainView) => {
    const state = get();
    // 意図: 表示の第一階層を一度に遷移させ、複数 boolean の組み合わせによる不整合を防ぐ。
    const patch = {
      mainView,
      // 意図: 検索は一時的なパネルとして開き、再フォーカスしても元のタブ・スレッドを上書きしない。
      searchReturnState:
        mainView === MAIN_VIEW.SEARCH
          ? state.mainView === MAIN_VIEW.SEARCH
            ? state.searchReturnState
            : {
                mainView: state.mainView,
                contentView: state.contentView,
                displayMode: state.displayMode,
                asTask: state.asTask,
                threadFocusRootId: state.threadFocusRootId,
                // 意図: 検索中の日付自動更新や絞り込み変更を、戻り先の日付表示へ持ち込まない。
                date: state.date.clone(),
                granularity: state.granularity,
                dateFilter: state.dateFilter,
                timeFilter: state.timeFilter,
                activeTag: state.activeTag,
              }
          : null,
      ...resolveMainViewCompatibilityState(mainView, state.displayMode),
      searchInputOpen: mainView === MAIN_VIEW.SEARCH,
      threadFocusRootId: null,
    };
    set(patch);
    persistNavigationState(get(), {
      mainView,
      contentView: patch.contentView,
      displayMode: patch.displayMode,
      asTask: patch.asTask,
      threadFocusRootId: null,
    });
  },

  closeSearch: () => {
    const state = get();
    if (state.mainView !== MAIN_VIEW.SEARCH) return;
    // 意図: 旧保存状態から検索を復元した場合は戻り先がないため、タイムラインへ戻す。
    const restored = state.searchReturnState ?? {
      mainView: MAIN_VIEW.TIMELINE,
      ...resolveMainViewCompatibilityState(MAIN_VIEW.TIMELINE),
      threadFocusRootId: null,
    };
    set({ ...restored, searchInputOpen: false, searchReturnState: null });
    persistNavigationState(get(), restored);
  },

  setAsTask: (asTask: boolean) => {
    const state = get();
    const mainView = asTask
      ? MAIN_VIEW.TASKS
      : state.displayMode === DISPLAY_MODE.FOCUS
        ? MAIN_VIEW.DATE
        : MAIN_VIEW.TIMELINE;
    applyNavigationPatch(get, set, {
      asTask,
      contentView: CONTENT_VIEW.TIMELINE,
      mainView,
    });
  },

  setThreadOnly: (threadOnly: boolean) => {
    // 検索UIからの絞り込み状態を明示管理し、見た目と実際の抽出条件を常に一致させる。
    set({ threadOnly });
  },

  setThreadFocusRootId: (threadFocusRootId, focusDate) => {
    set((state) => ({
      threadFocusRootId,
      date: threadFocusRootId !== null && focusDate != null ? focusDate.clone() : state.date,
      // 意図: スレッドはタブではなく現在ビュー上の詳細表示なので、閉じたら親ビューの取得方式へ戻す。
      displayMode:
        threadFocusRootId !== null
          ? DISPLAY_MODE.FOCUS
          : state.mainView === MAIN_VIEW.DATE
            ? DISPLAY_MODE.FOCUS
            : DISPLAY_MODE.TIMELINE,
    }));
    const state = get();
    persistNavigationState(state, {
      threadFocusRootId,
      displayMode: state.displayMode,
      ...(threadFocusRootId !== null && focusDate != null ? { date: state.date } : {}),
    });
  },

  handleClickHome: () => {
    // 意図: Home は今日の単日表示ではなく、クリックした時点の今月全体へ戻す。月をまたいだ起動中も再計算する。
    const homeDate = window.moment().startOf("month");
    const currentMainView = get().mainView;
    const mainViewCompatibility = resolveMainViewCompatibilityState(
      currentMainView,
      get().displayMode,
    );

    // 意図: 日付ビューの Home は日付・絞り込み状態だけを初期化し、
    // 上部タブの選択は維持して日付タブから意図せず遷移しないようにする。
    const state = applyNavigationPatch(get, set, {
      ...mainViewCompatibility,
      mainView: currentMainView,
      date: homeDate,
      granularity: "month",
      dateFilter: DEFAULT_VIEW_STATE.dateFilter,
      timeFilter: DEFAULT_VIEW_STATE.timeFilter,
      activeTag: DEFAULT_VIEW_STATE.activeTag,
      threadFocusRootId: DEFAULT_VIEW_STATE.threadFocusRootId,
    });
    state.reloadInputAreaSize();
  },

  handleClickToday: () => {
    const now = window.moment();
    const state = applyNavigationPatch(get, set, {
      date: now,
      displayMode: DISPLAY_MODE.FOCUS,
      contentView: CONTENT_VIEW.TIMELINE,
      mainView: MAIN_VIEW.DATE,
      asTask: false,
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
    const state = applyNavigationPatch(get, set, {
      date: nextDate,
      displayMode: DISPLAY_MODE.FOCUS,
      contentView: CONTENT_VIEW.TIMELINE,
      mainView: MAIN_VIEW.DATE,
      asTask: false,
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

function applyNavigationPatch(
  get: () => MFDIStore,
  set: (partial: Partial<MFDIStore>) => void,
  patch: PersistedNavigationState,
): MFDIStore {
  // 意図: 表示と保存に同じ差分を使い、遷移項目の追加時にも保存漏れを防ぐ。
  // 更新後の state を返すことで、入力サイズの復元は従来どおり保存の後に実行する。
  set(patch);
  const state = get();
  persistNavigationState(state, patch);
  return state;
}

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
  const state = applyNavigationPatch(get, set, {
    date: nextDate,
    displayMode: DISPLAY_MODE.FOCUS,
    threadFocusRootId: null,
  });
  state.reloadInputAreaSize();
}
