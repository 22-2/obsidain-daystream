import type { Settings } from "src/settings";
import {
  CONTENT_VIEW,
  DISPLAY_MODE,
  INPUT_AREA_SIZE,
  STORAGE_KEYS,
} from "src/ui/config/consntants";
import { DATE_FILTER_IDS, TIME_FILTER_IDS } from "src/ui/config/filter-config";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import {
  getInputAreaSizeStorageKey,
} from "src/ui/store/slices/inputStorage";
import type { MFDIStore } from "src/ui/store/slices/types";
import type {
  ContentView,
  DateFilter,
  DisplayMode,
  Granularity,
  InputAreaSize,
  TimeFilter,
} from "src/ui/types";
import type { MFDINoteMode } from "src/ui/view/state";

export function persistValue(
  state: Pick<MFDIStore, "storage">,
  key: string,
  value: unknown,
): void {
  state.storage?.set(key, value);
}

export function resolveInitialSettingsState(
  settings: Settings,
  storage: MFDIStore["storage"],
  viewNoteMode: MFDINoteMode,
  file: string | null,
) {
  // 編集中投稿が復元できる場合はその粒度・日付を優先する
  const editingPost =
    storage?.get<{
      offset: number;
      granularity: string;
      noteDateStr: string;
    } | null>(STORAGE_KEYS.EDITING_POST, null) ?? null;

  const granularity =
    editingPost !== null
      ? (editingPost.granularity as Granularity)
      : (storage?.get<Granularity>(STORAGE_KEYS.GRANULARITY, GRANULARITY_CONFIG.day.unit) ??
        GRANULARITY_CONFIG.day.unit);

  const savedDate =
    editingPost !== null
      ? editingPost.noteDateStr
      : (storage?.get<string | null>(STORAGE_KEYS.DATE, null) ?? null);

  const date = savedDate ? window.moment(savedDate) : window.moment();
  const validDate = date.isValid() ? date : window.moment();
  const sidebarOpen = storage?.get<boolean>(STORAGE_KEYS.SIDEBAR_OPEN, true) ?? true;
  const leftPanelOpen =
    storage?.get<boolean>(STORAGE_KEYS.PANEL_LEFT_OPEN, sidebarOpen) ?? sidebarOpen;
  const rightPanelOpen =
    storage?.get<boolean>(STORAGE_KEYS.PANEL_RIGHT_OPEN, sidebarOpen) ?? sidebarOpen;

  return {
    activeTopic: settings.activeTopic ?? "",
    activeTag: storage?.get<string | null>(STORAGE_KEYS.ACTIVE_TAG, null) ?? null,
    fixedSessionNumber: 1,
    granularity,
    date: validDate,
    timeFilter:
      storage?.get<TimeFilter>(STORAGE_KEYS.TIME_FILTER, TIME_FILTER_IDS.ALL) ??
      TIME_FILTER_IDS.ALL,
    dateFilter:
      storage?.get<DateFilter>(STORAGE_KEYS.DATE_FILTER, DATE_FILTER_IDS.TODAY) ??
      DATE_FILTER_IDS.TODAY,
    sidebarOpen,
    leftPanelOpen,
    rightPanelOpen,
    displayMode:
      storage?.get<DisplayMode>(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODE.TIMELINE) ??
      (DISPLAY_MODE.TIMELINE as DisplayMode),
    contentView:
      storage?.get<ContentView>(STORAGE_KEYS.CONTENT_VIEW, CONTENT_VIEW.TIMELINE) ??
      CONTENT_VIEW.TIMELINE,
    asTask: storage?.get<boolean>(STORAGE_KEYS.AS_TASK, false) ?? false,
    threadOnly: false,
    searchQuery: "",
    searchInputOpen: false,
    threadFocusRootId: storage?.get<string | null>(STORAGE_KEYS.THREAD_FOCUS_ROOT_ID, null) ?? null,
    inputAreaSize:
      storage?.get<InputAreaSize>(
        getInputAreaSizeStorageKey(viewNoteMode, file, granularity, validDate.format("YYYY-MM-DD")),
        INPUT_AREA_SIZE.DEFAULT,
      ) ?? INPUT_AREA_SIZE.DEFAULT,
  };
}
