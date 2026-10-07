import type {
  CONTENT_VIEW,
  DISPLAY_MODE,
  INPUT_AREA_SIZE,
  MAIN_VIEW,
} from "src/features/workspace/config/constants";
import type { DATE_FILTER_OPTIONS, TIME_FILTER_OPTIONS } from "src/features/workspace/config/filter-config";


/** 時間単位のフィルター型を config から自動推論 */
export type TimeFilter = (typeof TIME_FILTER_OPTIONS)[number]["id"];

/** 日単位のフィルター型を config から自動推論 */
export type DateFilter = (typeof DATE_FILTER_OPTIONS)[number]["id"];

export type DisplayMode = (typeof DISPLAY_MODE)[keyof typeof DISPLAY_MODE];

export type ContentView = (typeof CONTENT_VIEW)[keyof typeof CONTENT_VIEW];

export type MainView = (typeof MAIN_VIEW)[keyof typeof MAIN_VIEW];

export type InputAreaSize = (typeof INPUT_AREA_SIZE)[keyof typeof INPUT_AREA_SIZE];
