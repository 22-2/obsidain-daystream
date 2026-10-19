import { useMemo } from "react";
import type { Granularity } from "src/core/domain/granularity";
import type { Post } from "src/core/domain/post";
import { obsidianMoment } from "src/core/platform/obsidian-globals";
import type { DateFilter, DisplayMode, TimeFilter } from "src/features/workspace/types";
import { filterPostsByRelativeWindow } from "src/features/posts/utils/post-filters";
import { getPostTags, isPinned, isVisible } from "src/core/domain/post-metadata";
import { getThreadPosts, isVisibleRootPost, sortThreadPosts } from "src/features/posts/utils/thread-utils";
import { isThreadView, isTimelineView } from "src/features/workspace/utils/view-mode";
import type { DSTRNoteMode } from "src/features/workspace/views/state";

interface UseFilteredPostsProps {
  posts: Post[];
  activeTag?: string | null;
  timeFilter: TimeFilter;
  dateFilter: DateFilter;
  granularity: Granularity;
  displayMode: DisplayMode;
  threadFocusRootId: string | null;
  viewNoteMode?: DSTRNoteMode;
  includeThreadReplies?: boolean;
}

function comparePostsByTimestampDesc(left: Post, right: Post): number {
  // 意図: 同時刻投稿まで並べ替えると既存リストの見え方が不要に揺れるため、
  // 時刻差だけをキーにし、同時刻は安定ソートで元順を維持する。
  return right.timestamp.valueOf() - left.timestamp.valueOf();
}

function sortPostsByTimestampDesc(posts: Post[]): Post[] {
  return [...posts].sort(comparePostsByTimestampDesc);
}

function sortPostsPinnedFirst(posts: Post[]): Post[] {
  return [...posts].sort((left, right) => {
    const byPinned = Number(isPinned(right.metadata)) - Number(isPinned(left.metadata));
    if (byPinned !== 0) {
      return byPinned;
    }

    return comparePostsByTimestampDesc(left, right);
  });
}

function filterPostsForView({
  posts,
  activeTag = null,
  timeFilter,
  dateFilter,
  granularity,
  displayMode,
  threadFocusRootId,
  viewNoteMode = "periodic",
  includeThreadReplies = false,
}: UseFilteredPostsProps): Post[] {
  // 意図: DB 読み・ファイル読みの差は生の Post[] を作る所だけに閉じ込め、
  // 画面に出すためのルールはこのパイプラインに集約する。
  const postsWithoutHidden = sortPostsByTimestampDesc(
    posts.filter((post) => isVisible(post.metadata)),
  );
  const activeThreadRootId = threadFocusRootId;

  // 意図: スレッド表示は「選択した rootId の会話を読む」モード。
  // ここで activeTag を残したまま適用すると、タグ未設定の root/reply が全件除外され
  // 「スレッドに入ったのに投稿が0件」に見える退行が起こるため、
  // スレッドビューではタグ条件を無視して rootId のみで抽出する。
  if (activeThreadRootId && isThreadView({ displayMode, threadFocusRootId: activeThreadRootId })) {
    const threadPosts = sortPostsPinnedFirst(
      sortThreadPosts(getThreadPosts(postsWithoutHidden, activeThreadRootId), activeThreadRootId),
    );
    return includeThreadReplies ? threadPosts : threadPosts.filter(isVisibleRootPost);
  }

  const effectiveActiveTag = viewNoteMode === "fixed" ? null : activeTag;
  const postsMatchingTag =
    effectiveActiveTag == null
      ? postsWithoutHidden
      : postsWithoutHidden.filter((post) =>
          getPostTags(post.metadata).includes(effectiveActiveTag),
        );

  const visibleRoots = postsMatchingTag.filter(isVisibleRootPost);

  if (viewNoteMode === "fixed") {
    return sortPostsPinnedFirst(
      filterPostsByRelativeWindow(visibleRoots, {
        dateFilter,
        timeFilter,
        granularity,
      }),
    );
  }

  // タイムラインモード時は一切のフィルタ（期間、時間等）を無視して全件表示
  if (isTimelineView(displayMode)) {
    return sortPostsPinnedFirst(visibleRoots);
  }

  if (dateFilter !== "today") {
    return sortPostsPinnedFirst(visibleRoots);
  }

  if (timeFilter === "all" || granularity !== "day") {
    return sortPostsPinnedFirst(visibleRoots);
  }

  if (timeFilter === "latest") {
    return sortPostsPinnedFirst(visibleRoots.length > 0 ? [visibleRoots[0]] : []);
  }

  const hours = Number.parseInt(timeFilter, 10);
  if (Number.isNaN(hours)) {
    return sortPostsPinnedFirst(visibleRoots);
  }

  const now = obsidianMoment();
  return sortPostsPinnedFirst(
    visibleRoots.filter((post) => now.diff(post.timestamp, "hours") < hours),
  );
}

export const useFilteredPosts = ({
  posts,
  activeTag = null,
  timeFilter,
  dateFilter,
  granularity,
  displayMode,
  threadFocusRootId,
  viewNoteMode = "periodic",
  includeThreadReplies = false,
}: UseFilteredPostsProps) => {
  return useMemo(
    () =>
      filterPostsForView({
        posts,
        activeTag,
        timeFilter,
        dateFilter,
        granularity,
        displayMode,
        threadFocusRootId,
        viewNoteMode,
        includeThreadReplies,
      }),
    [
      posts,
      activeTag,
      timeFilter,
      dateFilter,
      granularity,
      displayMode,
      threadFocusRootId,
      viewNoteMode,
      includeThreadReplies,
    ],
  );
};
