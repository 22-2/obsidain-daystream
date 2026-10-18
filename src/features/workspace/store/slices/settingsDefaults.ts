import { obsidianMoment } from "src/core/platform/obsidian-globals";
import { CONTENT_VIEW, DISPLAY_MODE, INPUT_AREA_SIZE, MAIN_VIEW } from "src/features/workspace/config/constants";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/features/workspace/config/filter-config";
import { GRANULARITY_CONFIG } from "src/features/workspace/config/granularity-config";

export const DEFAULT_VIEW_STATE = {
  displayMode: DISPLAY_MODE.TIMELINE,
  contentView: CONTENT_VIEW.TIMELINE,
  mainView: MAIN_VIEW.TIMELINE,
  granularity: GRANULARITY_CONFIG.day.unit,
  dateFilter: DATE_FILTER_IDS.TODAY,
  timeFilter: TIME_FILTER_IDS.ALL,
  asTask: false,
  threadOnly: false,
  activeTag: null,
  threadFocusRootId: null,
} as const;

export const DEFAULT_LAYOUT_STATE = {
  sidebarOpen: true,
  leftPanelOpen: true,
  rightPanelOpen: true,
  searchQuery: "",
  searchInputOpen: false,
  inputAreaSize: INPUT_AREA_SIZE.DEFAULT,
} as const;

export function createTimelineNavigationState() {
  // 意図: タイムラインの投稿先は今日の日次ノートとし、日付タブや別 view の保存状態を持ち込まない。
  return { ...DEFAULT_VIEW_STATE, date: obsidianMoment(), dateSelection: null };
}
