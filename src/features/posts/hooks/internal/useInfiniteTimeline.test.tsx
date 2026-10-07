// @vitest-environment jsdom
import { DISPLAY_MODE } from "src/features/workspace/config/constants";
import { resolveTimelineBaseDate } from "src/features/posts/hooks/internal/timelinePosts";
import { resolveTimelineCacheBucket } from "src/features/posts/hooks/internal/useInfiniteTimeline";
import { settingsStore } from "src/features/workspace/store/settingsStore";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("useInfiniteTimeline", () => {
  const today = window.moment("2026-03-15T09:00:00.000Z");
  const yesterday = today.clone().subtract(1, "day");

  beforeEach(() => {
    vi.clearAllMocks();

    settingsStore.setState({
      activeTopic: "",
      granularity: "day",
      date: yesterday.clone(),
      timeFilter: "all",
      dateFilter: "today",
      sidebarOpen: true,
      displayMode: DISPLAY_MODE.TIMELINE,
      asTask: false,
      getEffectiveDate: () => today.clone(),
    });
  });

  it("タイムライン初回取得はフォーカス中の日付ではなく今日を基準にする", () => {
    const result = resolveTimelineBaseDate(null, settingsStore.getState().getEffectiveDate);

    expect(result.isSame(today, "day")).toBe(true);
    expect(result.isSame(yesterday, "day")).toBe(false);
  });

  it("次ページ取得時は pageParam を優先する", () => {
    const pageParam = yesterday.clone().format();
    const result = resolveTimelineBaseDate(pageParam, settingsStore.getState().getEffectiveDate);

    expect(result.isSame(yesterday, "day")).toBe(true);
  });

  it("ビュー表示時刻と投稿時刻が異なる場合は投稿時刻側の日付を基準にする", () => {
    let now = yesterday.clone();
    const getEffectiveDate = () => now.clone();

    const initialBaseDate = resolveTimelineBaseDate(null, getEffectiveDate);
    expect(initialBaseDate.isSame(yesterday, "day")).toBe(true);

    now = today.clone();
    const afterPostingBaseDate = resolveTimelineBaseDate(null, getEffectiveDate);
    expect(afterPostingBaseDate.isSame(today, "day")).toBe(true);
  });

  it("キャッシュバケットは指定間隔で切り替わる", () => {
    const intervalMs = 3 * 60 * 1000;

    expect(resolveTimelineCacheBucket(0, intervalMs)).toBe(0);
    expect(resolveTimelineCacheBucket(intervalMs - 1, intervalMs)).toBe(0);
    expect(resolveTimelineCacheBucket(intervalMs, intervalMs)).toBe(1);
  });
});
