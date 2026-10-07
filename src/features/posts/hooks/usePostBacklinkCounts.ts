import { useMemo } from "react";
import { useMFDIDB } from "src/core/db/hooks/useMFDIDB";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { Post } from "src/core/domain/post";
import {
  buildTargetPostBacklinkCountMap,
  buildTargetPostBacklinkPostsMap,
} from "src/features/posts/utils/post-backlinks";
import { memoRecordToPost } from "src/features/posts/utils/thread-utils";
import useSWR from "swr";

export function usePostBacklinks(targetPosts: Post[]): {
  countMap: Map<string, number>;
  postsMap: Map<string, Post[]>;
} {
  const db = useMFDIDB();
  const activeTopic = useSettingsStore((state) => state.activeTopic);
  const topicId = activeTopic || undefined;

  const { data: sourcePosts = [] } = useSWR<Post[]>(
    db ? ["posts", "backlinks", topicId ?? "all"] : null,
    async () => {
      const total = await db.countMemos(topicId);
      if (total === 0) {
        return [];
      }

      // 意図: backlink は現在表示中の日付だけでは閉じず、
      // 他日付の投稿からの参照も数える必要があるため、visible memo を全件取得する。
      const records = await db.getMemos({ topicId, limit: total });
      return records.map(memoRecordToPost);
    },
  );

  const postsMap = useMemo(
    () => buildTargetPostBacklinkPostsMap(targetPosts, sourcePosts),
    [targetPosts, sourcePosts],
  );
  const countMap = useMemo(
    () => buildTargetPostBacklinkCountMap(targetPosts, sourcePosts),
    [targetPosts, sourcePosts],
  );

  return useMemo(() => ({ countMap, postsMap }), [countMap, postsMap]);
}

export function usePostBacklinkCounts(targetPosts: Post[]): Map<string, number> {
  return usePostBacklinks(targetPosts).countMap;
}
