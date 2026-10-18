// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { refreshAllPosts } from "src/features/posts/utils/swr-utils";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { describe, expect, it, vi } from "vitest";

describe("refreshAllPosts", () => {
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
