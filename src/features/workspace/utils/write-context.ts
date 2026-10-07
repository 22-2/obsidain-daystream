import type { DisplayMode, Granularity, MomentLike } from "src/features/workspace/types";
import { isTimelineView } from "src/features/workspace/utils/view-mode";

/**
 * 投稿時に使うノートのGranularityを表示モードから解決する。
 * 日付ビューのGranularityは保持したまま、タイムラインの投稿先だけ日次へ固定する。
 */
export function resolveWriteGranularity(
  displayMode: DisplayMode,
  granularity: Granularity,
): Granularity {
  return isTimelineView(displayMode) ? "day" : granularity;
}

/** タイムラインへの新規投稿は、保存先の日付も常に実行時の今日へ寄せる。 */
export function resolveWriteDate(
  displayMode: DisplayMode,
  effectiveDate: MomentLike,
  now: MomentLike,
): MomentLike {
  return isTimelineView(displayMode) ? now : effectiveDate;
}
