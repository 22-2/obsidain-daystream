import { useCallback, useEffect, useMemo } from "react";
import { WorkerClient } from "src/core/db/worker-client";
import type { TimelinePostsPage } from "src/features/posts/hooks/internal/timelinePosts";
import {
  resolveTimelineBaseDate,
  resolveTimelineCacheBucket,
} from "src/features/posts/hooks/internal/timelinePosts";
import { useRequiredAppStore } from "src/features/workspace/store/appStore";
import { useNoteStore } from "src/features/notes/store/noteStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { getEffectiveSearchState } from "src/features/workspace/utils/search-state";
import { refreshAllPosts } from "src/features/posts/utils/swr-utils";
import { memoRecordToPost } from "src/features/posts/utils/thread-utils";
import { isTimelineView } from "src/features/workspace/utils/view-mode";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { useShallow } from "zustand/shallow";

const PAGE_SIZE_DAYS = 14;

/**
 * タイムラインモード（無限スクロール）のデータ取得と管理を担当するHook。
 */
export const useInfiniteTimeline = () => {
  const store = useRequiredAppStore();
  const { activeTopic, displayMode, date, searchQuery, threadOnly } = useSettingsStore(
    useShallow((s) => ({
      activeTopic: s.activeTopic,
      displayMode: s.displayMode,
      date: s.date,
      ...getEffectiveSearchState(s),
    })),
  );
  const timelineDayKey = date.format("YYYY-MM-DD");
  // Determine whether DB fetches should run for the timeline view.
  // Use the view-mode check at runtime inside timers to avoid TDZ/closure
  // issues in some test environments where globals are stubbed differently.
  const shouldFetchDb = isTimelineView(displayMode);
  const pinnedPostsKey = shouldFetchDb
    ? ["posts", "timeline-pinned", activeTopic, searchQuery, threadOnly]
    : null;

  const { addPaths } = useNoteStore(useShallow((s) => ({ addPaths: s.addPaths })));

  const { data: pinnedPosts } = useSWR(pinnedPostsKey, async () => {
    const dbService = WorkerClient.get();
    const records = await dbService.getPinnedMemos({
      topicId: activeTopic,
      query: searchQuery,
      threadOnly,
      // 意図: タイムラインは日次ノートの流れなので、日付ビューで作られた
      // 週次・月次などの投稿を pinned 経由でも混ぜない。
      noteGranularity: "day",
    });

    return records.map(memoRecordToPost);
  });

  useEffect(() => {
    // タイムラインを表示中であれば、現在の日付とタイムラインの基準日が同じか確認し、異なっていれば更新する
    const timer = window.setInterval(() => {
      // タイムライン非表示中、またはウィンドウがフォーカスされていない場合は何もしない
      if (
        !isTimelineView(displayMode) ||
        !(typeof activeDocument !== "undefined" && activeDocument.hasFocus())
      ) {
        return;
      }

      const state = store.getState();
      const now = window.moment();
      if (!state.date.isSame(now, "day")) {
        state.setDate(now);
      }

      void refreshAllPosts({
        activeTopic,
        displayMode,
        timelineDayKey,
        searchQuery,
        threadOnly,
      });
    }, 30 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeTopic, displayMode, shouldFetchDb, searchQuery, threadOnly, timelineDayKey, store]);

  // ---------------------------------------------------------------------------
  // 無限クエリ
  // ---------------------------------------------------------------------------
  const {
    data: infiniteData,
    size,
    setSize,
    isValidating,
    isLoading,
  } = useSWRInfinite<TimelinePostsPage>(
    (pageIndex, previousPageData) => {
      if (!shouldFetchDb) return null;
      if (previousPageData && !previousPageData.hasMore) return null;

      const pageParam =
        pageIndex === 0
          ? null
          : previousPageData!.lastSearchedDate.clone().subtract(1, "day").format();

      return [
        "posts",
        activeTopic,
        displayMode,
        timelineDayKey,
        searchQuery,
        threadOnly,
        pageParam,
      ];
    },
    async (key) => {
      const dbService = WorkerClient.get();
      const pageParam = key[key.length - 1];

      const baseDate = resolveTimelineBaseDate(pageParam, store.getState().getEffectiveDate);

      const endDate = baseDate.clone().endOf("day");
      const startDate = baseDate
        .clone()
        .subtract(PAGE_SIZE_DAYS - 1, "day")
        .startOf("day");

      const records = await dbService.getMemos({
        topicId: activeTopic,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        query: searchQuery,
        threadOnly,
        // 意図: タイムラインの投稿先・表示対象を日次ノートに限定し、
        // 別Granularityの投稿が同じ日付範囲へ流入するのを防ぐ。
        noteGranularity: "day",
      });

      const posts = records.map(memoRecordToPost);
      const paths = new Set(posts.map((p) => p.path));
      addPaths(paths);

      const older = await dbService.getMemos({
        topicId: activeTopic,
        startDate: "0000-01-01T00:00:00.000Z",
        endDate: startDate.clone().subtract(1, "ms").toISOString(),
        limit: 1,
        query: searchQuery,
        threadOnly,
        noteGranularity: "day",
      });

      const result: TimelinePostsPage = {
        posts,
        paths,
        hasMore: (older?.length ?? 0) > 0,
        lastSearchedDate: startDate,
      };

      return result;
    },
    {
      // 意図: タグ更新などで global mutate(infiniteKey) を呼ぶ経路では、
      // SWR Infinite の bound mutate が立てる「全ページ再検証フラグ」が入らない。
      // 既定値のままだと 1 ページ目だけ新鮮化され、スクロールで読み込んだ後続ページは
      // 古い投稿メタデータのまま残るため、タイムライン側で常に全ロード済みページを再検証する。
      revalidateAll: true,
    },
  );

  const hasNextPage = infiniteData && infiniteData[infiniteData.length - 1]?.hasMore;
  const isFetchingNextPage =
    size > 0 && infiniteData && typeof infiniteData[size - 1] === "undefined";
  // SWR loads all pages on initial mount if size > 1, but here size starts at 1.
  // When loading more, setSize(size + 1) makes isValidating true.

  // ---------------------------------------------------------------------------
  // ページデータを取得
  // ---------------------------------------------------------------------------
  const allPosts = useMemo(() => {
    const timelinePosts = infiniteData?.flatMap((p) => p.posts) ?? [];
    if (!pinnedPosts?.length) {
      return timelinePosts;
    }

    const timelinePostIds = new Set(timelinePosts.map((post) => post.id));
    const pinnedVisiblePosts = pinnedPosts.filter((post) => !timelinePostIds.has(post.id));

    // 意図: pinned はスクロールに依存せず先頭へ出す。
    // DB から別取得して、ページング結果の前に合成する。
    return [...pinnedVisiblePosts, ...timelinePosts];
  }, [infiniteData, pinnedPosts]);

  // ---------------------------------------------------------------------------
  // 次ページ読み込みトリガー
  // ---------------------------------------------------------------------------
  const loadMore = useCallback(() => {
    if (hasNextPage && !isValidating) setSize(size + 1);
  }, [hasNextPage, isValidating, size, setSize]);

  return useMemo(
    () => ({
      allPosts,
      loadMore,
      hasMore: hasNextPage,
      isFetchingNextPage,
      isLoading,
      isValidating,
    }),
    [allPosts, loadMore, hasNextPage, isFetchingNextPage, isLoading, isValidating],
  );
};

export { resolveTimelineCacheBucket };
