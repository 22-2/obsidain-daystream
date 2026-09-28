import type { Moment } from "moment";
import type { Granularity } from "src/ui/config/granularity-config";
import type {
  CONTENT_VIEW,
  DISPLAY_MODE,
  INPUT_AREA_SIZE,
  MAIN_VIEW,
} from "src/ui/config/consntants";
import type { DATE_FILTER_OPTIONS, TIME_FILTER_OPTIONS } from "src/ui/config/filter-config";

export type { Granularity };

export type MomentLike = Moment;

/** 時間単位のフィルター型を config から自動推論 */
export type TimeFilter = (typeof TIME_FILTER_OPTIONS)[number]["id"];

/** 日単位のフィルター型を config から自動推論 */
export type DateFilter = (typeof DATE_FILTER_OPTIONS)[number]["id"];

export type DisplayMode = (typeof DISPLAY_MODE)[keyof typeof DISPLAY_MODE];

export type ContentView = (typeof CONTENT_VIEW)[keyof typeof CONTENT_VIEW];

export type MainView = (typeof MAIN_VIEW)[keyof typeof MAIN_VIEW];

export type InputAreaSize = (typeof INPUT_AREA_SIZE)[keyof typeof INPUT_AREA_SIZE];

export interface Post {
  id: string;
  threadRootId: string | null;
  /** 投稿元のノート粒度。複数粒度の結果が混在する場合の識別に使う。 */
  noteGranularity?: Granularity;
  timestamp: MomentLike;
  noteDate: MomentLike;
  message: string;
  metadata: Record<string, string>;
  offset: number;
  startOffset: number;
  endOffset: number;
  bodyStartOffset: number;
  kind: "thino";
  path: string;
}

export interface Draft {
  id: string;
  content: string;
  createdAt: number;
}
