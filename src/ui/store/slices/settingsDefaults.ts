import { CONTENT_VIEW, DISPLAY_MODE, INPUT_AREA_SIZE } from "src/ui/config/consntants";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/ui/config/filter-config";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";

export const DEFAULT_VIEW_STATE = {
  displayMode: DISPLAY_MODE.TIMELINE,
  contentView: CONTENT_VIEW.TIMELINE,
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
