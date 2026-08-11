import type { AppStoreApi } from "src/ui/store/appStore";
import type { MFDIViewState } from "src/ui/view/state";
import { createDefaultMFDIViewState } from "src/ui/view/state";

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
