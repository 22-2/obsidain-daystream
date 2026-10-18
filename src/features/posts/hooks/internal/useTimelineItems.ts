import { useMemo } from "react";
import type { Post } from "src/core/domain/post";
import { isPinned } from "src/core/domain/post-metadata";

export type TimelineItem =
  | { type: "post"; post: Post; key: string }
  | {
      type: "pinned-divider";
      key: string;
      groupKey: string;
      collapsed: boolean;
    }
  | { type: "pinned-end"; key: string };

type UseTimelineItemsInput = {
  filteredPosts: Post[];
  collapsedGroupSet: Set<string>;
  canCollapseDividers: boolean;
};

type UseTimelineItemsOutput = {
  displayedPostsWithDividers: TimelineItem[];
  visibleDividerGroupKeys: string[];
};

export function useTimelineItems({
  filteredPosts,
  collapsedGroupSet,
  canCollapseDividers,
}: UseTimelineItemsInput): UseTimelineItemsOutput {
  const displayedPostsWithDividers = useMemo(() => {
    const list: TimelineItem[] = [];

    const pinnedPosts = filteredPosts.filter((post) => isPinned(post.metadata));
    const unpinnedPosts = filteredPosts.filter((post) => !isPinned(post.metadata));
    const pinnedGroupKey = "pinned";
    const isPinnedCollapsed = canCollapseDividers && collapsedGroupSet.has(pinnedGroupKey);

    if (pinnedPosts.length > 0) {
      // 意図: ピン留め投稿は通常の投稿とは分けて、
      // リスト最上部の専用セクションにまとめて表示する。
      list.push({
        type: "pinned-divider",
        key: "divider-pinned",
        groupKey: pinnedGroupKey,
        collapsed: isPinnedCollapsed,
      });

      if (!isPinnedCollapsed) {
        pinnedPosts.forEach((post) => {
          list.push({
            type: "post",
            post,
            key: `post-${post.timestamp.valueOf()}-${post.offset}`,
          });
        });

        // 意図: ピン留めの範囲が分かるよう、通常投稿との境目に終端を置く。
        if (unpinnedPosts.length > 0) {
          list.push({ type: "pinned-end", key: "divider-pinned-end" });
        }
      }
    }

    unpinnedPosts.forEach((post) => {
      list.push({
        type: "post",
        post,
        key: `post-${post.timestamp.valueOf()}-${post.offset}`,
      });
    });

    return list;
  }, [filteredPosts, canCollapseDividers, collapsedGroupSet]);

  const visibleDividerGroupKeys = useMemo(
    () =>
      displayedPostsWithDividers
        .filter(
          (item): item is Extract<TimelineItem, { groupKey: string }> =>
            item.type === "pinned-divider",
        )
        .map((item) => item.groupKey),
    [displayedPostsWithDividers],
  );

  return { displayedPostsWithDividers, visibleDividerGroupKeys };
}
