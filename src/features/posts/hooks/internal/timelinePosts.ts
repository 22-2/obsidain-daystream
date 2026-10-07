import type { MFDIDatabase } from "src/core/db/mfdi-db";
import type { MomentLike, Post } from "src/core/domain/post";
import { memoRecordToPost } from "src/features/posts/utils/thread-utils";

export type TimelinePostsPage = {
  posts: Post[];
  paths: Set<string>;
  hasMore: boolean;
  lastSearchedDate: MomentLike;
};

const TIMELINE_CACHE_INVALIDATE_MS = 3 * 60 * 1000;

export function resolveTimelineCacheBucket(
  nowMs: number = Date.now(),
  intervalMs: number = TIMELINE_CACHE_INVALIDATE_MS,
): number {
  return Math.floor(nowMs / intervalMs);
}

interface CreateTimelinePageFetcherDeps {
  db: MFDIDatabase;
}

export function resolveTimelineBaseDate(
  pageParam: string | null,
  getEffectiveDate: () => MomentLike,
): MomentLike {
  return pageParam ? window.moment(pageParam) : getEffectiveDate().clone();
}

function createTimelinePageFetcher({ db }: CreateTimelinePageFetcherDeps) {
  return async (
    topicId: string,
    baseDate: MomentLike,
    days: number,
  ): Promise<TimelinePostsPage> => {
    const windowStart = baseDate
      .clone()
      .subtract(days - 1, "days")
      .startOf("day");
    const windowEnd = baseDate.clone().endOf("day");

    const records = await db.getVisibleMemosByDateRange({
      topicId,
      startDate: windowStart.toISOString(),
      endDate: windowEnd.toISOString(),
    });

    const posts = records.map(memoRecordToPost);

    // 次のページがあるかの簡易判定（windowStartより前の投稿が1つでもあるか）
    const olderRecord = await db.getVisibleMemosByDateRange({
      topicId,
      startDate: "0000-01-01T00:00:00.000Z",
      endDate: windowStart.clone().subtract(1, "ms").toISOString(),
      limit: 1,
    });

    return {
      posts,
      paths: new Set(posts.map((p) => p.path)),
      hasMore: olderRecord.length > 0,
      lastSearchedDate: windowStart,
    };
  };
}
