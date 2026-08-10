import { DISPLAY_MODE } from "src/ui/config/consntants";
import { DEFAULT_VIEW_STATE } from "src/ui/store/slices/settingsSlice";
import type { SettingsSlice } from "src/ui/store/slices/types";

type ResettableViewState = Pick<
  SettingsSlice,
  | "displayMode"
  | "granularity"
  | "dateFilter"
  | "timeFilter"
  | "asTask"
  | "threadFocusRootId"
  | "activeTag"
  | "searchQuery"
  | "searchInputOpen"
>;

type CenterIndicatorState = Pick<
  SettingsSlice,
  "displayMode" | "threadFocusRootId" | "activeTag"
>;

export function isDefaultViewState(state: ResettableViewState): boolean {
  return (
    state.displayMode === DEFAULT_VIEW_STATE.displayMode &&
    state.granularity === DEFAULT_VIEW_STATE.granularity &&
    state.dateFilter === DEFAULT_VIEW_STATE.dateFilter &&
    state.timeFilter === DEFAULT_VIEW_STATE.timeFilter &&
    state.asTask === DEFAULT_VIEW_STATE.asTask &&
    state.activeTag === DEFAULT_VIEW_STATE.activeTag &&
    state.threadFocusRootId === DEFAULT_VIEW_STATE.threadFocusRootId &&
    // 意図: 検索中は default 見た目に戻さず、home で検索解除する導線を明示する。
    // 検索欄を開いてフォーカスしただけでは、まだ検索状態ではない。
    state.searchQuery === ""
  );
}

export function getCenterIndicatorLabel(state: CenterIndicatorState): string {
  if (state.activeTag != null) {
    return "タグ表示中";
  }

  if (state.threadFocusRootId != null) {
    return "スレッド表示中";
  }

  return state.displayMode === DISPLAY_MODE.TIMELINE
    ? "タイムライン表示中"
    : "フォーカス表示中";
}
