import { useMemo } from "react";
import type { DateFilter, DisplayMode, Granularity, MomentLike, Post } from "src/features/workspace/types";
import { isPinned } from "src/core/domain/post-metadata";
import { isTimelineView } from "src/features/workspace/utils/view-mode";
import type { MFDINoteMode } from "src/features/workspace/views/state";

export type TimelineItem =
  | { type: "post"; post: Post; key: string }
  | {
      type: "divider";
      date: MomentLike;
      key: string;
      groupKey: string;
      collapsed: boolean;
    }
  | {
      type: "pinned-divider";
      key: string;
      groupKey: string;
      collapsed: boolean;
    };

type UseTimelineItemsInput = {
  filteredPosts: Post[];
  collapsedGroupSet: Set<string>;
  canCollapseDividers: boolean;
  displayMode: DisplayMode;
  granularity: Granularity;
  dateFilter: DateFilter;
  viewNoteMode: MFDINoteMode;
};

type UseTimelineItemsOutput = {
  displayedPostsWithDividers: TimelineItem[];
  visibleDividerGroupKeys: string[];
};

export function useTimelineItems({
  filteredPosts,
  collapsedGroupSet,
  canCollapseDividers,
  displayMode,
  granularity,
  dateFilter,
  viewNoteMode,
}: UseTimelineItemsInput): UseTimelineItemsOutput {
  const displayedPostsWithDividers = useMemo(() => {
    const list: TimelineItem[] = [];
    let lastDate: string | null = null;
    let currentDateGroupCollapsed = false;

    const pinnedPosts = filteredPosts.filter((post) => isPinned(post.metadata));
    const unpinnedPosts = filteredPosts.filter((post) => !isPinned(post.metadata));
    const hasPinnedSection = pinnedPosts.length > 0;
    const pinnedGroupKey = "pinned";
    const isPinnedCollapsed = canCollapseDividers && collapsedGroupSet.has(pinnedGroupKey);

    if (pinnedPosts.length > 0) {
      // 意図: ピン留め投稿は日付グループとは独立して、
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
      }
    }

    unpinnedPosts.forEach((post) => {
      const currentDate = post.timestamp.format("YYYY-MM-DD");
      const shouldShowDividers =
        // fixedノートは複数日の投稿が混在するため、常にdividerを表示する
        viewNoteMode === "fixed" ||
        isTimelineView(displayMode) ||
        granularity !== "day" ||
        dateFilter !== "today";
      const isDateChanged = lastDate !== currentDate;
      const isFirstItem = lastDate === null;
      const isDateInPast = post.timestamp.isBefore(new Date(), "day");
      const shouldShowTodayDividerAfterPinned = hasPinnedSection && isFirstItem;
      const showDivider =
        shouldShowDividers &&
        isDateChanged &&
        (!isFirstItem || isDateInPast || shouldShowTodayDividerAfterPinned);

      if (showDivider) {
        const groupKey = `date-${currentDate}`;
        currentDateGroupCollapsed = canCollapseDividers && collapsedGroupSet.has(groupKey);
        list.push({
          type: "divider",
          date: post.timestamp,
          key: `divider-${currentDate}`,
          groupKey,
          collapsed: currentDateGroupCollapsed,
        });
      } else if (isDateChanged) {
        currentDateGroupCollapsed = false;
      }

      if (!currentDateGroupCollapsed) {
        list.push({
          type: "post",
          post,
          key: `post-${post.timestamp.valueOf()}-${post.offset}`,
        });
      }

      lastDate = currentDate;
    });

    return list;
  }, [
    filteredPosts,
    granularity,
    displayMode,
    dateFilter,
    viewNoteMode,
    canCollapseDividers,
    collapsedGroupSet,
  ]);

  const visibleDividerGroupKeys = useMemo(
    () =>
      displayedPostsWithDividers
        .filter(
          (item): item is Extract<TimelineItem, { groupKey: string }> =>
            item.type === "divider" || item.type === "pinned-divider",
        )
        .map((item) => item.groupKey),
    [displayedPostsWithDividers],
  );

  return { displayedPostsWithDividers, visibleDividerGroupKeys };
}
