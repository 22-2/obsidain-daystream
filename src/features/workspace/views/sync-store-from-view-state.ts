import { createTimelineNavigationState } from "src/features/workspace/store/slices/settingsDefaults";
import { MAIN_VIEW } from "src/features/workspace/config/constants";
import type { AppStoreApi } from "src/features/workspace/store/appStore";
import type { DSTRViewState } from "src/features/workspace/views/state";
import { createDefaultDSTRViewState } from "src/features/workspace/views/state";
import { resolveMainViewCompatibilityState } from "src/features/workspace/utils/main-view-state";

export function syncStoreFromDSTRViewState(store: AppStoreApi, viewState: DSTRViewState): void {
  const nextFixedSessionNumber =
    viewState.noteMode === "fixed" ? (viewState.fixedSessionNumber ?? 1) : 1;
  const currentState = store.getState();
  // 意図: ボードなどの固定ノートから戻るときは、固定ノート用に上書きされた表示状態を
  // 復元済みのタブに合わせ直す。タブの値が同じでも設定し直す。
  const isLeavingFixed = currentState.viewNoteMode === "fixed" && viewState.noteMode !== "fixed";

  if (
    currentState.viewNoteMode !== viewState.noteMode ||
    currentState.file !== viewState.file ||
    currentState.fixedSessionNumber !== nextFixedSessionNumber
  ) {
    currentState.setViewContext({
      noteMode: viewState.noteMode,
      file: viewState.file,
      fixedSessionNumber: nextFixedSessionNumber,
    });
  }

  if (viewState.noteMode !== "fixed") {
    if (isLeavingFixed) {
      // 意図: 固定ノート用に上書きされた粒度・期間などを、戻る先の view state に合わせ直す。
      store.setState({
        granularity: viewState.granularity,
        dateFilter: viewState.dateFilter,
        timeFilter: viewState.timeFilter,
        threadOnly: viewState.threadOnly,
      });
    }
    if (
      viewState.mainView !== undefined &&
      (isLeavingFixed || currentState.mainView !== viewState.mainView)
    ) {
      // 意図: 上部タブは view ごとに独立させ、別タブの vault 全体設定で
      // 現在のタブが上書きされないよう、復元時は永続化せず view state を優先する。
      store.setState({
        mainView: viewState.mainView,
        ...resolveMainViewCompatibilityState(viewState.mainView, currentState.displayMode),
        ...(viewState.mainView === MAIN_VIEW.TIMELINE ? createTimelineNavigationState() : {}),
        searchInputOpen: viewState.mainView === MAIN_VIEW.SEARCH,
        threadFocusRootId: null,
      });
    }
    return;
  }

  const fixedDefaults = createDefaultDSTRViewState({
    noteMode: "fixed",
    file: viewState.file,
  });
  const latestState = store.getState();
  const nextPatch: Partial<ReturnType<AppStoreApi["getState"]>> = {};

  // 意図: fixed ノートは periodic の永続 UI 状態を持ち込まない一方で、
  // 復元済み fixedSessionNumber だけはそのまま維持して reopen 後の位置ズレを防ぐ。
  if (latestState.displayMode !== fixedDefaults.displayMode) {
    nextPatch.displayMode = fixedDefaults.displayMode;
  }
  if (latestState.granularity !== fixedDefaults.granularity) {
    nextPatch.granularity = fixedDefaults.granularity;
  }
  if (latestState.dateFilter !== fixedDefaults.dateFilter) {
    nextPatch.dateFilter = fixedDefaults.dateFilter;
  }
  if (latestState.timeFilter !== fixedDefaults.timeFilter) {
    nextPatch.timeFilter = fixedDefaults.timeFilter;
  }
  if (latestState.contentView !== "timeline") {
    nextPatch.contentView = "timeline";
  }
  if (latestState.mainView !== MAIN_VIEW.TIMELINE) {
    nextPatch.mainView = MAIN_VIEW.TIMELINE;
  }
  if (latestState.threadOnly !== fixedDefaults.threadOnly) {
    nextPatch.threadOnly = fixedDefaults.threadOnly;
  }
  if (latestState.activeTag !== null) {
    nextPatch.activeTag = null;
  }
  if (latestState.threadFocusRootId !== null) {
    nextPatch.threadFocusRootId = null;
  }

  if (Object.keys(nextPatch).length > 0) {
    store.setState(nextPatch);
  }
}
