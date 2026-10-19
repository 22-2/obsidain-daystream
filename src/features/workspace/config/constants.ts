export const PLACEHOLDER_TEXT = "なんでもかいていいのよ😊";
export const READONLY_PLACEHOLDER_TEXT = "閲覧モード（書き込み不可）";
export const DISPLAY_MODE = {
  FOCUS: "focus",
  TIMELINE: "timeline",
} as const;

export const CONTENT_VIEW = {
  TIMELINE: "timeline",
  INSIGHTS: "insights",
} as const;

/** ユーザーが上部タブから直接選べる、画面の第一階層。 */
export const MAIN_VIEW = {
  DATE: "date",
  TIMELINE: "timeline",
  SEARCH: "search",
  INSIGHTS: "insights",
} as const;

export const STORAGE_KEYS = {
  TOPICS: "topics",
  ACTIVE_TOPIC: "activeTopic",
  ACTIVE_TAG: "activeTag",
  TIME_FILTER: "timeFilter",
  DATE_FILTER: "dateFilter",
  SIDEBAR_OPEN: "sidebarOpen",
  PANEL_LEFT_OPEN: "panelLeftOpen",
  PANEL_RIGHT_OPEN: "panelRightOpen",
  PANEL_SECTION_STATES: "panelSectionStates",
  GRANULARITY: "granularity",
  DATE: "date",
  DATE_SELECTION: "dateSelection",
  DISPLAY_MODE: "displayMode",
  CONTENT_VIEW: "contentView",
  MAIN_VIEW: "mainView",
  INPUT: "input",
  INPUT_PERIODIC: "inputPeriodic",
  INPUT_FIXED: "inputFixed",
  INPUT_FIXED_DRAFT_METADATA: "inputFixedDraftMetadata",
  INPUT_PERIODIC_DRAFT_METADATA: "inputPeriodicDraftMetadata",
  // 編集中投稿のセッション情報を1オブジェクトにまとめて保存する
  EDITING_POST: "editingPost",
  DRAFTS: "drafts",
  THREAD_FOCUS_ROOT_ID: "threadFocusRootId",
  COLLAPSED_POST_GROUP_KEYS: "collapsedPostGroupKeys",
  INPUT_AREA_SIZE: "inputAreaSize",
  // 旧バージョンの値を読み込まないまま、保存済みデータとの互換性のためキー名だけ残す。
  COMPOSER_OPEN: "composerOpen",
  FIXED_SESSION_META: "fixedSessionMeta",
  FIXED_SESSION_LAST_OPENED: "fixedSessionLastOpened",
  // ポップアウトエディタのキャンセル時に確認モーダルをスキップするかどうか
  SKIP_POPOUT_DISCARD_CONFIRM: "skipPopoutDiscardConfirm",
} as const;

export const INPUT_AREA_SIZE = {
  DEFAULT: "default",
  MAXIMIZED: "maximized",
  MINIMIZED: "minimized",
} as const;

export const MOVE_STEP = {
  DEFAULT: 1,
  WEEK: 7,
} as const;
