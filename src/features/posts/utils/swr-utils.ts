import type { DisplayMode } from "src/features/workspace/types";
import { isTimelineView } from "src/features/workspace/utils/view-mode";
import { mutate } from "swr";
import { unstable_serialize as serializeInfiniteKey } from "swr/infinite";

export type RefreshPostsContext = {
  activeTopic: string;
  displayMode: DisplayMode;
  timelineDayKey: string;
  searchQuery: string;
  threadOnly: boolean;
};

/**
 * タイムラインの useSWRInfinite が使うページキーを組み立てる。
 * 意図: 取得側と再検証側で同じ関数を使い、要素の追加・並べ替えで
 * 再検証だけが別キーを指して更新されなくなるのを防ぐ。
 */
export function buildTimelinePostsKey(
  {
    activeTopic,
    displayMode,
    timelineDayKey,
    searchQuery,
    threadOnly,
  }: RefreshPostsContext,
  pageParam: string | null,
) {
  return [
    "posts",
    activeTopic,
    displayMode,
    timelineDayKey,
    searchQuery,
    threadOnly,
    pageParam,
  ] as const;
}

function getTimelineInfinitePostsKey(context: RefreshPostsContext): string {
  return serializeInfiniteKey(() => buildTimelinePostsKey(context, null));
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
