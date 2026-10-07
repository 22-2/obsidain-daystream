// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { isPostsKey, refreshAllPosts } from "src/features/posts/utils/swr-utils";
import useSWR, { unstable_serialize as serializeKey } from "swr";
import useSWRInfinite, { unstable_serialize as serializeInfiniteKey } from "swr/infinite";
import { describe, expect, it, vi } from "vitest";

describe("isPostsKey", () => {
  it("元の配列キーを posts 系として判定する", () => {
    expect(isPostsKey(["posts", "focus", "topic-a"])).toBe(true);
    expect(isPostsKey(["calendar", "2026-03-15"])).toBe(false);
  });

  it("useSWR のシリアライズ済みキーを posts 系として判定する", () => {
    const serializedKey = serializeKey([
      "posts",
      "focus",
      "topic-a",
      "2026-03-15",
      "2026-03-15",
      "",
    ]);

    expect(isPostsKey(serializedKey)).toBe(true);
  });

  it("useSWRInfinite の親キーを posts 系として判定する", () => {
    const serializedKey = serializeInfiniteKey((pageIndex, previousPageData) => [
      "posts",
      "topic-a",
      "timeline",
      "2026-03-15",
      "",
      false,
      pageIndex === 0 ? null : previousPageData,
    ]);

    expect(isPostsKey(serializedKey)).toBe(true);
  });

  it("refreshAllPosts で useSWR の posts キャッシュを再検証できる", async () => {
    vi.useRealTimers();

    let records = ["before"];
    const fetcher = async () => records;

    const { result } = renderHook(() =>
      useSWR(["posts", "focus", "topic-refresh", "2026-03-15", "2026-03-15", ""], fetcher, {
        revalidateOnFocus: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(["before"]);
    });

    records = ["after"];

    await act(async () => {
      await refreshAllPosts({
        activeTopic: "topic-refresh",
        displayMode: "focus",
        timelineDayKey: "2026-03-15",
        searchQuery: "",
        threadOnly: false,
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(["after"]);
    });
  });

  it("refreshAllPosts でカレンダーの活動日キャッシュも再検証できる", async () => {
    vi.useRealTimers();

    let records = ["2026-03-15"];
    const fetcher = async () => records;

    const { result } = renderHook(() =>
      useSWR(["activeDates"], fetcher, { revalidateOnFocus: false }),
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(["2026-03-15"]);
    });

    records = ["2026-03-15", "2026-03-16"];

    await act(async () => {
      await refreshAllPosts({
        activeTopic: "topic-refresh",
        displayMode: "focus",
        timelineDayKey: "2026-03-15",
        searchQuery: "",
        threadOnly: false,
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(["2026-03-15", "2026-03-16"]);
    });
  });

  it("refreshAllPosts で useSWRInfinite の posts キャッシュを再検証できる", async () => {
    vi.useRealTimers();

    let records = ["before"];
    const fetcher = async () => records;

    const { result } = renderHook(() =>
      useSWRInfinite(
        (pageIndex) =>
          pageIndex === 0
            ? ["posts", "topic-infinite", "timeline", "2026-03-15", "", false, null]
            : null,
        fetcher,
        { revalidateOnFocus: false },
      ),
    );

    await waitFor(() => {
      expect(result.current.data).toEqual([["before"]]);
    });

    records = ["after"];

    await act(async () => {
      await refreshAllPosts({
        activeTopic: "topic-infinite",
        displayMode: "timeline",
        timelineDayKey: "2026-03-15",
        searchQuery: "",
        threadOnly: false,
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([["after"]]);
    });
  });
});
