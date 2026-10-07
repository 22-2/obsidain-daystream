import type { DisplayMode } from "src/features/workspace/types";
import { refreshAllPosts } from "src/features/posts/utils/swr-utils";

type RefreshPosts = (path?: string) => Promise<void>;

interface RefreshPostsDeps {
  activeTopic: string;
  displayMode: DisplayMode;
  timelineDayKey: string;
  searchQuery: string;
  threadOnly: boolean;
}

/**
 * データの変更（投稿・編集・削除）があった際に、SWRのキャッシュを無効化する。
 */
export function createRefreshPosts({
  activeTopic,
  displayMode,
  timelineDayKey,
  searchQuery,
  threadOnly,
}: RefreshPostsDeps): RefreshPosts {
  return async () => {
    await refreshAllPosts({
      activeTopic,
      displayMode,
      timelineDayKey,
      searchQuery,
      threadOnly,
    });
  };
}
