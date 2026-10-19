import { obsidianMoment } from "src/core/platform/obsidian-globals";
import type { DateSelection } from "src/features/workspace/utils/date-selection";
import type { Settings } from "src/core/domain/settings";
import {
  CONTENT_VIEW,
  DISPLAY_MODE,
  INPUT_AREA_SIZE,
  MAIN_VIEW,
  STORAGE_KEYS,
} from "src/features/workspace/config/constants";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/features/workspace/config/filter-config";
import { GRANULARITY_CONFIG } from "src/features/workspace/config/granularity-config";
import { restoreEditingPost } from "src/features/composer/store/slices/editorPersistence";
import { getInputAreaSizeStorageKey } from "src/features/composer/store/slices/inputStorage";
import type { DSTRStore } from "src/features/workspace/store/slices/types";
import type { Granularity } from "src/core/domain/granularity";
import type { MomentLike } from "src/core/domain/post";
import type { ContentView, DateFilter, DisplayMode, InputAreaSize, MainView, TimeFilter } from "src/features/workspace/types";
import type { DSTRNoteMode } from "src/features/workspace/views/state";
import { resolveMainViewCompatibilityState } from "src/features/workspace/utils/main-view-state";

export interface PersistedNavigationState {
  activeTag?: string | null;
  timeFilter?: TimeFilter;
  dateFilter?: DateFilter;
  granularity?: Granularity;
  date?: MomentLike;
  dateSelection?: DateSelection | null;
  displayMode?: DisplayMode;
  contentView?: ContentView;
  mainView?: MainView;
  threadFocusRootId?: string | null;
}

export function persistNavigationState(
  state: Pick<DSTRStore, "storage" | "mainView">,
  patch: PersistedNavigationState,
): void {
  const storage = state.storage;
  if (!storage) return;

  if ("activeTag" in patch) storage.set(STORAGE_KEYS.ACTIVE_TAG, patch.activeTag);
  if ("timeFilter" in patch) storage.set(STORAGE_KEYS.TIME_FILTER, patch.timeFilter);
  if ("dateFilter" in patch) storage.set(STORAGE_KEYS.DATE_FILTER, patch.dateFilter);
  // 意図: タイムライン内の一時的な日付・粒度は保存せず、日付タブの保存先も上書きしない。
  if (state.mainView !== MAIN_VIEW.TIMELINE) {
    if ("dateSelection" in patch) storage.set(STORAGE_KEYS.DATE_SELECTION, patch.dateSelection);
    if ("granularity" in patch) storage.set(STORAGE_KEYS.GRANULARITY, patch.granularity);
    if ("date" in patch && patch.date) storage.set(STORAGE_KEYS.DATE, patch.date.toISOString());
  }
  if ("displayMode" in patch) storage.set(STORAGE_KEYS.DISPLAY_MODE, patch.displayMode);
  if ("contentView" in patch) storage.set(STORAGE_KEYS.CONTENT_VIEW, patch.contentView);
  if ("mainView" in patch) storage.set(STORAGE_KEYS.MAIN_VIEW, patch.mainView);
  if ("threadFocusRootId" in patch) {
    storage.set(STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, patch.threadFocusRootId);
  }
}

export interface PersistedLayoutState {
  sidebarOpen?: boolean;
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
}

export function persistLayoutState(
  state: Pick<DSTRStore, "storage">,
  patch: PersistedLayoutState,
): void {
  const storage = state.storage;
  if (!storage) return;

  if ("sidebarOpen" in patch) storage.set(STORAGE_KEYS.SIDEBAR_OPEN, patch.sidebarOpen);
  if ("leftPanelOpen" in patch) storage.set(STORAGE_KEYS.PANEL_LEFT_OPEN, patch.leftPanelOpen);
  if ("rightPanelOpen" in patch) storage.set(STORAGE_KEYS.PANEL_RIGHT_OPEN, patch.rightPanelOpen);
}

type InputAreaPersistenceState = Pick<
  DSTRStore,
  "storage" | "viewNoteMode" | "file" | "granularity" | "date"
>;

export function persistInputAreaSize(state: InputAreaPersistenceState, size: InputAreaSize): void {
  // 意図: 最大化は現在の作業中だけの状態とし、日付やノートを再訪したときに勝手に展開しない。
  state.storage?.set(
    getInputAreaSizeStorageKey(
      state.viewNoteMode,
      state.file,
      state.granularity,
      state.date.format("YYYY-MM-DD"),
    ),
    size === INPUT_AREA_SIZE.MAXIMIZED ? INPUT_AREA_SIZE.DEFAULT : size,
  );
}

export function restoreInputAreaSize(state: InputAreaPersistenceState): InputAreaSize {
  const savedSize =
    state.storage?.get<InputAreaSize>(
      getInputAreaSizeStorageKey(
        state.viewNoteMode,
        state.file,
        state.granularity,
        state.date.format("YYYY-MM-DD"),
      ),
      INPUT_AREA_SIZE.DEFAULT,
    ) ?? INPUT_AREA_SIZE.DEFAULT;
  // 意図: 旧バージョンが保存した最大化も通常サイズとして扱い、再起動・再訪で復活させない。
  return savedSize === INPUT_AREA_SIZE.MAXIMIZED ? INPUT_AREA_SIZE.DEFAULT : savedSize;
}

export function resolveInitialSettingsState(
  settings: Settings,
  storage: DSTRStore["storage"],
  viewNoteMode: DSTRNoteMode,
  file: string | null,
) {
  // 編集中投稿が復元できる場合はその粒度・日付を優先する。
  // 意図: 粒度と日付を持つのは定期ノートの表示だけなので、固定ノートの編集状態は参照しない。
  const editingPost =
    viewNoteMode === "periodic"
      ? restoreEditingPost({ storage, viewNoteMode, file, fixedSessionNumber: 1 })
      : null;

  const granularity =
    editingPost !== null
      ? (editingPost.granularity as Granularity)
      : (storage?.get<Granularity>(STORAGE_KEYS.GRANULARITY, GRANULARITY_CONFIG.day.unit) ??
        GRANULARITY_CONFIG.day.unit);

  const savedDate =
    editingPost !== null
      ? // 意図: 旧バージョンの保存値は表示日付を noteDateStr に持っていたため、それで補う。
        (editingPost.viewDateStr ?? editingPost.noteDateStr)
      : (storage?.get<string | null>(STORAGE_KEYS.DATE, null) ?? null);

  const date = savedDate ? obsidianMoment(savedDate) : obsidianMoment();
  const validDate = date.isValid() ? date : obsidianMoment();
  const sidebarOpen = storage?.get<boolean>(STORAGE_KEYS.SIDEBAR_OPEN, true) ?? true;
  const leftPanelOpen =
    storage?.get<boolean>(STORAGE_KEYS.PANEL_LEFT_OPEN, sidebarOpen) ?? sidebarOpen;
  const rightPanelOpen =
    storage?.get<boolean>(STORAGE_KEYS.PANEL_RIGHT_OPEN, sidebarOpen) ?? sidebarOpen;
  const displayMode =
    storage?.get<DisplayMode>(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.TIMELINE) ??
    (DISPLAY_MODE.TIMELINE);
  const contentView =
    storage?.get<ContentView>(STORAGE_KEYS.CONTENT_VIEW, CONTENT_VIEW.TIMELINE) ??
    CONTENT_VIEW.TIMELINE;
  const savedMainView = storage?.get<MainView | null>(STORAGE_KEYS.MAIN_VIEW, null) ?? null;
  // 意図: 既存ユーザーの保存値から同じ画面を復元しつつ、今後の遷移は mainView に一本化する。
  const mainView = Object.values(MAIN_VIEW).includes(savedMainView as MainView)
    ? (savedMainView as MainView)
    : contentView === CONTENT_VIEW.INSIGHTS
      ? MAIN_VIEW.INSIGHTS
      : displayMode === DISPLAY_MODE.FOCUS
        ? MAIN_VIEW.DATE
        : MAIN_VIEW.TIMELINE;
  const mainViewCompatibility = resolveMainViewCompatibilityState(mainView, displayMode);

  return {
    activeTopic: settings.activeTopic ?? "",
    activeTag: storage?.get<string | null>(STORAGE_KEYS.ACTIVE_TAG, null) ?? null,
    fixedSessionNumber: 1,
    granularity,
    date: validDate,
    dateSelection: editingPost === null && viewNoteMode !== "fixed"
      ? storage?.get<DateSelection | null>(STORAGE_KEYS.DATE_SELECTION, null) ?? null
      : null,
    timeFilter:
      storage?.get<TimeFilter>(STORAGE_KEYS.TIME_FILTER, TIME_FILTER_IDS.ALL) ??
      TIME_FILTER_IDS.ALL,
    dateFilter:
      storage?.get<DateFilter>(STORAGE_KEYS.DATE_FILTER, DATE_FILTER_IDS.TODAY) ??
      DATE_FILTER_IDS.TODAY,
    sidebarOpen,
    leftPanelOpen,
    rightPanelOpen,
    displayMode: mainViewCompatibility.displayMode,
    contentView: mainViewCompatibility.contentView,
    mainView,
    threadOnly: false,
    searchQuery: "",
    searchInputOpen: false,
    threadFocusRootId: storage?.get<string | null>(STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null) ?? null,
    inputAreaSize: restoreInputAreaSize({
      storage,
      viewNoteMode,
      file,
      granularity,
      date: validDate,
    }),
  };
}
