import type { ReactNode } from "react";
import React from "react";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useCollapsedGroups } from "src/features/posts/hooks/internal/useCollapsedGroups";
import { useTimelineItems, type TimelineItem } from "src/features/posts/hooks/internal/useTimelineItems";
import { useFilteredPosts } from "src/features/posts/hooks/useFilteredPosts";
import { useUnifiedPosts } from "src/features/posts/hooks/useUnifiedPosts";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { Post } from "src/features/workspace/types";
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

  const { collapsedGroupSet, toggleCollapsedGroup, collapseGroups, expandGroups } =
    useCollapsedGroups({ storage, canCollapseDividers });

  const { displayedPostsWithDividers, visibleDividerGroupKeys } = useTimelineItems({
    filteredPosts,
    collapsedGroupSet,
    canCollapseDividers,
    displayMode: settings.displayMode,
    granularity: settings.granularity,
    dateFilter: settings.dateFilter,
    viewNoteMode: settings.viewNoteMode,
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
      loadMore: unified.loadMore,
      hasMore: unified.hasMore ?? false,
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
