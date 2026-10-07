import type { DisplayMode } from "src/features/workspace/types";
import { isTimelineView } from "src/features/workspace/utils/view-mode";
import { mutate } from "swr";
import { unstable_serialize as serializeInfiniteKey } from "swr/infinite";

type RefreshPostsContext = {
  activeTopic: string;
  displayMode: DisplayMode;
  timelineDayKey: string;
  searchQuery: string;
  threadOnly: boolean;
};

/**
 * SWR のキーが 'posts' 関連であるか判定する。
 * SWR 2.x の useSWR (Array) と useSWRInfinite (String with $inf$ prefix) の両方に対応する。
 */
export function isPostsKey(key: string | string[]): boolean {
  return key.includes("posts");
}

function getTimelineInfinitePostsKey({
  activeTopic,
  displayMode,
  timelineDayKey,
  searchQuery,
  threadOnly,
}: RefreshPostsContext): string {
  return serializeInfiniteKey(() => [
    "posts",
    activeTopic,
    displayMode,
    timelineDayKey,
    searchQuery,
    threadOnly,
    null,
  ]);
}

/**
 * 全ての 'posts' 関連のキャッシュを再検証する。
 */
export async function refreshAllPosts(context: RefreshPostsContext) {
  // 意図: global mutate(predicate) は内部で `$inf$...` の special key を走査対象から外す。
  // そのため通常の posts key 再検証だけでは useSWRInfinite の親キャッシュが更新されず、
  // タイムラインだけ「submit 後は古いまま / focus 復帰でだけ更新」に陥る。
  await mutate((key) => Array.isArray(key) && key[0] === "posts");
  // 投稿直後にミニカレンダーの活動日ドットも更新する。
  await mutate(["activeDates"]);

  if (!isTimelineView(context.displayMode)) {
    return;
  }

  await mutate(getTimelineInfinitePostsKey(context));
}
