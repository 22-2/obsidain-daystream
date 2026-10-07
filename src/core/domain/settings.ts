import type { Topic } from "src/core/topic";
import { DEFAULT_TOPIC } from "src/core/topic";

// 意図: 設定の保存契約と正規化をUIやDBから独立させ、どの層も同じ値を扱う。
export type OpenInNewWindowMode = "disabled" | "always";
export type EditorExpansionMode = "full" | "default";
export type CtrlEnterSendMode = "collapsed_only" | "disabled";

export interface Settings {
  postFormatOption: PostFormatOption;
  insertAfter: string;
  enabledCardView: boolean;
  autoToggleSidebar: boolean;
  debugMode: boolean;
  // When true, posts become scrollable only after being clicked (activated).
  allowEditingPastNotes: boolean;
  updateDateStrategy: "never" | "always" | "same_day";
  topics: Topic[];
  activeTopic: string;
  files: { path: string }[];
  fullScanIntervalHours?: number;
  // 「今何してる？」通知の間隔（分）。0 以下で無効。
  activityPromptIntervalMinutes?: number;
  editorExpansionMode: EditorExpansionMode;
  // 投稿の編集をポップアウトウィンドウで開くタイミング
  openInNewWindowMode: OpenInNewWindowMode;
  // 通常サイズの入力欄だけ Ctrl+Enter で投稿し、展開中は送信しない。
  ctrlEnterSends: CtrlEnterSendMode;
}

export const DEFAULT_SETTINGS: Settings = {
  postFormatOption: "Thino",
  insertAfter: "## Thino",
  enabledCardView: false,
  autoToggleSidebar: true,
  debugMode: false,
  allowEditingPastNotes: false,
  updateDateStrategy: "never",
  topics: [DEFAULT_TOPIC],
  activeTopic: "",
  files: [],
  fullScanIntervalHours: 24,
  activityPromptIntervalMinutes: 60,
  editorExpansionMode: "default",
  openInNewWindowMode: "disabled",
  ctrlEnterSends: "disabled",
};

/**
 * 旧バージョンの boolean 設定を、展開状態を持つ新しい2択へ移行する。
 * 以前の true は送信を有効にしていたため、ユーザーの意図を保つために
 * 「展開してない時のみ有効」へ読み替える。
 */
export function normalizeCtrlEnterSendMode(value: unknown): CtrlEnterSendMode {
  return value === true || value === "collapsed_only" ? "collapsed_only" : "disabled";
}

export const postFormatMap = {
  Thino: { type: "thino" },
} as const;
export type PostFormatOption = keyof typeof postFormatMap;
