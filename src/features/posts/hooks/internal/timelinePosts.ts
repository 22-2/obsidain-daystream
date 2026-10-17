import type { MomentLike, Post } from "src/core/domain/post";
import { obsidianMoment } from "src/core/platform/obsidian-globals";

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

export function resolveTimelineBaseDate(
  pageParam: string | null,
  getEffectiveDate: () => MomentLike,
): MomentLike {
  return pageParam ? obsidianMoment(pageParam) : getEffectiveDate().clone();
}
