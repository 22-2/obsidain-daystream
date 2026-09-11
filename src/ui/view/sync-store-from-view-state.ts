import { MAIN_VIEW } from "src/ui/config/consntants";
import type { AppStoreApi } from "src/ui/store/appStore";
import type { MFDIViewState } from "src/ui/view/state";
import { createDefaultMFDIViewState } from "src/ui/view/state";
import { resolveMainViewCompatibilityState } from "src/ui/utils/main-view-state";

export function syncStoreFromMFDIViewState(store: AppStoreApi, viewState: MFDIViewState): void {
  const nextFixedSessionNumber =
    viewState.noteMode === "fixed" ? (viewState.fixedSessionNumber ?? 1) : 1;
  const currentState = store.getState();

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
    if (viewState.mainView !== undefined && currentState.mainView !== viewState.mainView) {
      // 意図: 上部タブは view ごとに独立させ、別タブの vault 全体設定で
      // 現在のタブが上書きされないよう、復元時は永続化せず view state を優先する。
      store.setState({
        mainView: viewState.mainView,
        ...resolveMainViewCompatibilityState(viewState.mainView, currentState.displayMode),
        searchInputOpen: viewState.mainView === MAIN_VIEW.SEARCH,
        threadFocusRootId: null,
      });
    }
    return;
  }

  const fixedDefaults = createDefaultMFDIViewState({
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
  if (latestState.asTask !== fixedDefaults.asTask) {
    nextPatch.asTask = fixedDefaults.asTask;
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
