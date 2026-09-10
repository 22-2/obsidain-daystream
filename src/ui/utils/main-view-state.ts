import { CONTENT_VIEW, DISPLAY_MODE, MAIN_VIEW } from "src/ui/config/consntants";
import type { ContentView, DisplayMode, MainView } from "src/ui/types";

export interface MainViewCompatibilityState {
  contentView: ContentView;
  displayMode: DisplayMode;
  asTask: boolean;
}

/** 旧来の表示軸を mainView から一意に導出する互換境界。 */
export function resolveMainViewCompatibilityState(
  mainView: MainView,
  previousDisplayMode: DisplayMode = DISPLAY_MODE.TIMELINE,
): MainViewCompatibilityState {
  switch (mainView) {
    case MAIN_VIEW.DATE:
      return {
        contentView: CONTENT_VIEW.TIMELINE,
        displayMode: DISPLAY_MODE.FOCUS,
        asTask: false,
      };
    case MAIN_VIEW.TASKS:
      return {
        contentView: CONTENT_VIEW.TIMELINE,
        displayMode: DISPLAY_MODE.TIMELINE,
        asTask: true,
      };
    case MAIN_VIEW.INSIGHTS:
      return {
        contentView: CONTENT_VIEW.INSIGHTS,
        // 意図: インサイトから戻る際に、直前の期間/タイムライン取得方式を壊さない。
        displayMode: previousDisplayMode,
        asTask: false,
      };
    case MAIN_VIEW.SEARCH:
    case MAIN_VIEW.TIMELINE:
      return {
        contentView: CONTENT_VIEW.TIMELINE,
        displayMode: DISPLAY_MODE.TIMELINE,
        asTask: false,
      };
  }
}
