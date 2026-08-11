import { renderHook } from "@testing-library/react";
import moment from "moment";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import type { Post } from "src/ui/types";
import { afterEach, describe, expect, test, vi } from "vitest";

function createPost(overrides: Partial<Post>): Post {
  const timestamp = overrides.timestamp ?? moment("2026-03-15T10:00:00.000Z");
  return {
    id: overrides.id ?? "post-1",
    threadRootId: overrides.threadRootId ?? null,
    timestamp,
    noteDate: overrides.noteDate ?? moment("2026-03-15T00:00:00.000Z"),
    message: overrides.message ?? "message",
    metadata: overrides.metadata ?? {},
    offset: overrides.offset ?? 0,
    startOffset: overrides.startOffset ?? 0,
    endOffset: overrides.endOffset ?? 10,
    bodyStartOffset: overrides.bodyStartOffset ?? 2,
    kind: "thino",
    path: overrides.path ?? "2026-03-15.md",
  };
}

describe("useFilteredPosts", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("通常表示ではスレッド返信を隠す", () => {
    const posts = [
      createPost({ id: "reply-1", threadRootId: "root-1", startOffset: 20 }),
      createPost({ id: "root-1", threadRootId: "root-1" }),
      createPost({ id: "plain-1", startOffset: 40 }),
    ];

    const { result } = renderHook(() =>
      useFilteredPosts({
        posts,
        activeTag: null,
        timeFilter: "all",
        dateFilter: "today",
        asTask: false,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: null,
      }),
    );

    expect(result.current.map((post) => post.id)).toEqual(["root-1", "plain-1"]);
  });

  test("スレッド表示では親と子だけを返す", () => {
    const posts = [
      createPost({ id: "plain-1", startOffset: 40 }),
      createPost({
        id: "reply-2",
        threadRootId: "root-1",
        timestamp: moment("2026-03-16T01:00:00.000Z"),
        startOffset: 60,
      }),
      createPost({ id: "root-1", threadRootId: "root-1" }),
      createPost({
        id: "reply-1",
        threadRootId: "root-1",
        timestamp: moment("2026-03-15T12:00:00.000Z"),
        startOffset: 20,
      }),
    ];

    const { result } = renderHook(() =>
      useFilteredPosts({
        posts,
        activeTag: null,
        timeFilter: "all",
        dateFilter: "today",
        asTask: false,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: "root-1",
        includeThreadReplies: true,
      }),
    );

    expect(result.current.map((post) => post.id)).toEqual(["reply-2", "reply-1", "root-1"]);
  });

  test("スレッド表示中は activeTag が残っていても対象スレッドを表示する", () => {
    const posts = [
      createPost({ id: "plain-1", metadata: { mfditags: "IT" } }),
      createPost({ id: "root-1", threadRootId: "root-1", metadata: {} }),
      createPost({
        id: "reply-1",
        threadRootId: "root-1",
        startOffset: 20,
        metadata: {},
      }),
    ];

    const { result } = renderHook(() =>
      useFilteredPosts({
        posts,
        activeTag: "IT",
        timeFilter: "all",
        dateFilter: "today",
        asTask: false,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: "root-1",
        includeThreadReplies: true,
      }),
    );

    expect(result.current.map((post) => post.id)).toEqual(["reply-1", "root-1"]);
  });

  test("activeTag があるとタグ一致の投稿だけ返す", () => {
    const posts = [
      createPost({ id: "it-1", metadata: { mfditags: "IT, Later" } }),
      createPost({ id: "writing-1", metadata: { mfditags: "writing" } }),
      createPost({ id: "plain-1", startOffset: 30 }),
    ];

    const { result } = renderHook(() =>
      useFilteredPosts({
        posts,
        activeTag: "IT",
        timeFilter: "all",
        dateFilter: "today",
        asTask: false,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: null,
      }),
    );

    expect(result.current.map((post) => post.id)).toEqual(["it-1"]);
  });

  test("ピン留めは先頭に寄せ、ピン留め同士は投稿日時順で並ぶ", () => {
    const posts = [
      createPost({
        id: "plain-latest",
        timestamp: moment("2026-03-15T12:00:00.000Z"),
      }),
      createPost({
        id: "pinned-earlier",
        timestamp: moment("2026-03-15T09:00:00.000Z"),
        metadata: { pinned: "1" },
        startOffset: 20,
      }),
      createPost({
        id: "pinned-latest",
        timestamp: moment("2026-03-15T11:00:00.000Z"),
        metadata: { pinned: "1" },
        startOffset: 40,
      }),
    ];

    const { result } = renderHook(() =>
      useFilteredPosts({
        posts,
        activeTag: null,
        timeFilter: "all",
        dateFilter: "today",
        asTask: false,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: null,
      }),
    );

    expect(result.current.map((post) => post.id)).toEqual([
      "pinned-latest",
      "pinned-earlier",
      "plain-latest",
    ]);
  });

  test("latest フィルタはピン留めより先に時刻で最新投稿を選ぶ", () => {
    const posts = [
      createPost({
        id: "older-pinned",
        timestamp: moment("2026-03-15T09:00:00.000Z"),
        metadata: { pinned: "1" },
      }),
      createPost({
        id: "latest-plain",
        timestamp: moment("2026-03-15T12:00:00.000Z"),
        startOffset: 20,
      }),
    ];

    const { result } = renderHook(() =>
      useFilteredPosts({
        posts,
        activeTag: null,
        timeFilter: "latest",
        dateFilter: "today",
        asTask: false,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: null,
      }),
    );

    expect(result.current.map((post) => post.id)).toEqual(["latest-plain"]);
  });

  test("fixed note では現在時刻基準の日付フィルタを適用する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-18T12:00:00.000Z"));

    const posts = [
      createPost({
        id: "today-1",
        timestamp: moment("2026-03-18T10:00:00.000Z"),
      }),
      createPost({
        id: "within-3d",
        timestamp: moment("2026-03-16T09:00:00.000Z"),
      }),
      createPost({
        id: "outside-3d",
        timestamp: moment("2026-03-14T23:00:00.000Z"),
      }),
    ];

    const { result } = renderHook(() =>
      useFilteredPosts({
        posts,
        activeTag: null,
        timeFilter: "all",
        dateFilter: "3d",
        asTask: false,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: null,
        viewNoteMode: "fixed",
      }),
    );

    expect(result.current.map((post) => post.id)).toEqual(["today-1", "within-3d"]);
  });

  test("fixed note では timeFilter を適用し、activeTag は無視する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-18T12:00:00.000Z"));

    const posts = [
      createPost({
        id: "recent-plain",
        timestamp: moment("2026-03-18T11:30:00.000Z"),
        metadata: {},
      }),
      createPost({
        id: "older-tagged",
        timestamp: moment("2026-03-18T08:00:00.000Z"),
        metadata: { mfditags: "IT" },
      }),
    ];

    const { result } = renderHook(() =>
      useFilteredPosts({
        posts,
        activeTag: "IT",
        timeFilter: "2h",
        dateFilter: "today",
        asTask: false,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: null,
        viewNoteMode: "fixed",
      }),
    );

    expect(result.current.map((post) => post.id)).toEqual(["recent-plain"]);
  });
});
