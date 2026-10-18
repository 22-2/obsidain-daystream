import type { ReactNode } from "react";
import React from "react";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useCollapsedGroups } from "src/features/posts/hooks/internal/useCollapsedGroups";
import { useTimelineItems, type TimelineItem } from "src/features/posts/hooks/internal/useTimelineItems";
import { useFilteredPosts } from "src/features/posts/hooks/useFilteredPosts";
import { useUnifiedPosts } from "src/features/posts/hooks/useUnifiedPosts";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { Post } from "src/core/domain/post";
import { isPinned } from "src/core/domain/post-metadata";
import { getEffectiveSearchState } from "src/features/workspace/utils/search-state";
import { isThreadView, isTimelineView } from "src/features/workspace/utils/view-mode";
import { useShallow } from "zustand/shallow";

export type UsePostsOutput = {
  posts: Post[];
  filteredPosts: Post[];
  filteredPostsWithThreadReplies: Post[];
  timelineItems: TimelineItem[];
  visibleDividerGroupKeys: string[];
  collapsedGroupSet: Set<string>;
  canCollapseDividers: boolean;
  toggleCollapsedGroup: (groupKey: string) => void;
  collapseGroups: (groupKeys: string[]) => void;
  expandGroups: (groupKeys: string[]) => void;
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  isValidating: boolean;
  timelineView: boolean;
  threadView: boolean;
};

// 意図: 年・月などの絞り込みで全件を一度に描画せず、タイムラインと同じ無限スクロールにそろえる。
const FOCUS_PAGE_SIZE = 50;

const PostsContext = React.createContext<UsePostsOutput | null>(null);

export function PostsProvider({ children }: { children: ReactNode }) {
  const { storage } = useAppContext();
  const settings = useSettingsStore(
    useShallow((s) => ({
      activeTag: s.activeTag,
      timeFilter: s.timeFilter,
      dateFilter: s.dateFilter,
      asTask: s.asTask,
      granularity: s.granularity,
      displayMode: s.displayMode,
      threadFocusRootId: s.threadFocusRootId,
      viewNoteMode: s.viewNoteMode,
      date: s.date,
      dateSelection: s.dateSelection,
      ...getEffectiveSearchState(s),
    })),
  );

  const unified = useUnifiedPosts();

  // 意図: 投稿取得から画面向け整形までを provider に集約し、
  // 呼び出し側ごとに条件差分が生まれて表示や挙動がズレるのを防ぐ。
  const filteredPosts = useFilteredPosts({
    posts: unified.posts,
    ...settings,
  });

  const filteredPostsWithThreadReplies = useFilteredPosts({
    posts: unified.posts,
    ...settings,
    includeThreadReplies: true,
  });

  const timelineView = settings.viewNoteMode !== "fixed" && isTimelineView(settings.displayMode);
  const threadView = isThreadView({
    displayMode: settings.displayMode,
    threadFocusRootId: settings.threadFocusRootId,
  });
  const canCollapseDividers =
    timelineView && !threadView && settings.searchQuery.trim().length === 0;

  const pagedFocusView = !timelineView && !threadView && settings.viewNoteMode !== "fixed";
  const pagingKey = JSON.stringify([
    settings.activeTag,
    settings.timeFilter,
    settings.dateFilter,
    settings.asTask,
    settings.granularity,
    settings.displayMode,
    settings.searchQuery,
    settings.date.valueOf(),
    settings.dateSelection,
  ]);
  const [pageState, setPageState] = React.useState({ key: pagingKey, count: FOCUS_PAGE_SIZE });
  // 意図: 絞り込み条件が変わったら、前の条件で伸ばした件数を引き継がず先頭ページから始める。
  const visibleCount = pageState.key === pagingKey ? pageState.count : FOCUS_PAGE_SIZE;

  const pinnedCount = React.useMemo(
    () => filteredPosts.filter((post) => isPinned(post.metadata)).length,
    [filteredPosts],
  );
  const focusLimit = pinnedCount + visibleCount;
  const focusHasMore = pagedFocusView && filteredPosts.length > focusLimit;
  const pagedPosts = React.useMemo(
    () => (pagedFocusView ? filteredPosts.slice(0, focusLimit) : filteredPosts),
    [pagedFocusView, filteredPosts, focusLimit],
  );
  const loadMoreFocus = React.useCallback(() => {
    setPageState({ key: pagingKey, count: visibleCount + FOCUS_PAGE_SIZE });
  }, [pagingKey, visibleCount]);

  const { collapsedGroupSet, toggleCollapsedGroup, collapseGroups, expandGroups } =
    useCollapsedGroups({ storage, canCollapseDividers });

  const { displayedPostsWithDividers, visibleDividerGroupKeys } = useTimelineItems({
    filteredPosts: pagedPosts,
    collapsedGroupSet,
    canCollapseDividers,
  });

  const value = React.useMemo(
    () => ({
      posts: unified.posts,
      filteredPosts,
      filteredPostsWithThreadReplies,
      timelineItems: displayedPostsWithDividers,
      visibleDividerGroupKeys,
      collapsedGroupSet,
      canCollapseDividers,
      toggleCollapsedGroup,
      collapseGroups,
      expandGroups,
      loadMore: pagedFocusView ? loadMoreFocus : unified.loadMore,
      hasMore: pagedFocusView ? focusHasMore : (unified.hasMore ?? false),
      isLoading: unified.isLoading,
      isValidating: unified.isValidating,
      timelineView,
      threadView,
    }),
    [
      canCollapseDividers,
      collapseGroups,
      collapsedGroupSet,
      displayedPostsWithDividers,
      expandGroups,
      filteredPosts,
      filteredPostsWithThreadReplies,
      threadView,
      timelineView,
      toggleCollapsedGroup,
      pagedFocusView,
      focusHasMore,
      loadMoreFocus,
      unified.hasMore,
      unified.isLoading,
      unified.isValidating,
      unified.loadMore,
      unified.posts,
      visibleDividerGroupKeys,
    ],
  );

  return React.createElement(PostsContext.Provider, { value }, children);
}

export function usePosts(): UsePostsOutput {
  const ctx = React.useContext(PostsContext);
  if (!ctx) {
    throw new Error("usePosts must be used within PostsProvider");
  }
  return ctx;
}
