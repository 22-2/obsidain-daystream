import { DISPLAY_MODE, MAIN_VIEW } from "src/features/workspace/config/constants";
import { DEFAULT_VIEW_STATE } from "src/features/workspace/store/slices/settingsSlice";
import type { SettingsSlice } from "src/features/workspace/store/slices/types";

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
> & {
  // 旧呼び出し元（ポップアウトや既存テスト）は mainView を持たないため任意にする。
  mainView?: SettingsSlice["mainView"];
};

type CenterIndicatorState = Pick<SettingsSlice, "displayMode" | "threadFocusRootId" | "activeTag">;

export function isDefaultViewState(
  state: ResettableViewState,
  defaultGranularity: SettingsSlice["granularity"] = DEFAULT_VIEW_STATE.granularity,
): boolean {
  const defaultDisplayMode =
    state.mainView === MAIN_VIEW.DATE ? DISPLAY_MODE.FOCUS : DEFAULT_VIEW_STATE.displayMode;
  const searchStateIsActive =
    state.mainView == null || state.mainView === MAIN_VIEW.SEARCH || state.searchInputOpen === true;

  return (
    state.displayMode === defaultDisplayMode &&
    state.granularity === defaultGranularity &&
    state.dateFilter === DEFAULT_VIEW_STATE.dateFilter &&
    state.timeFilter === DEFAULT_VIEW_STATE.timeFilter &&
    state.asTask === DEFAULT_VIEW_STATE.asTask &&
    state.activeTag === DEFAULT_VIEW_STATE.activeTag &&
    state.threadFocusRootId === DEFAULT_VIEW_STATE.threadFocusRootId &&
    // 意図: 日付・タイムライン等の各タブでは検索条件を適用しないため、
    // 別タブに保持した検索語だけで日付ビューの Home を非 default 扱いにしない。
    (!searchStateIsActive || state.searchQuery === "")
  );
}

export function isHomeViewState(
  state: ResettableViewState & Pick<SettingsSlice, "date">,
  now = window.moment(),
): boolean {
  // 意図: 表示条件だけでなく日付も Home の戻り先と比較し、別の月へ移動したときに色を切り替える。
  return isDefaultViewState(state, "month") && state.date.isSame(now, "month");
}

export function getCenterIndicatorLabel(state: CenterIndicatorState): string {
  if (state.activeTag != null) {
    return "タグ表示中";
  }

  if (state.threadFocusRootId != null) {
    return "スレッド表示中";
  }

  return state.displayMode === DISPLAY_MODE.TIMELINE ? "タイムライン表示中" : "フォーカス表示中";
}
