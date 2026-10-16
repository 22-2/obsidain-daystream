// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import moment from "moment";
import React from "react";
import type { MemoRecord } from "src/core/db/daystream-db";
import { usePostBacklinkCounts, usePostBacklinks } from "src/features/posts/hooks/usePostBacklinkCounts";
import type { Post } from "src/core/domain/post";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  countMemos: vi.fn(),
  getMemos: vi.fn(),
  activeTopic: "work",
}));

vi.mock("src/core/db/hooks/useDaystreamDB", () => ({
  useDaystreamDB: () => ({
    countMemos: mocked.countMemos,
    getMemos: mocked.getMemos,
  }),
}));

vi.mock("src/features/workspace/store/settingsStore", () => ({
  useSettingsStore: <T,>(selector: (state: { activeTopic: string }) => T): T =>
    selector({ activeTopic: mocked.activeTopic }),
}));

function createPost(overrides: Partial<Post>): Post {
  const timestamp = overrides.timestamp ?? moment("2026-04-10T16:00:00.000Z");

  return {
    id: overrides.id ?? "post-1",
    threadRootId: overrides.threadRootId ?? null,
    timestamp,
    noteDate: overrides.noteDate ?? moment("2026-04-10T00:00:00.000Z"),
    message: overrides.message ?? "message",
    metadata: overrides.metadata ?? {},
    offset: overrides.offset ?? 0,
    startOffset: overrides.startOffset ?? 0,
    endOffset: overrides.endOffset ?? 10,
    bodyStartOffset: overrides.bodyStartOffset ?? 2,
    kind: "thino",
    path: overrides.path ?? "daily/2026-04-10.md",
  };
}

function createMemoRecord(overrides: Partial<MemoRecord>): MemoRecord {
  return {
    id: overrides.id ?? "daily/2026-04-11.md:10",
    path: overrides.path ?? "daily/2026-04-11.md",
    noteName: overrides.noteName ?? "2026-04-11",
    topicId: overrides.topicId ?? "work",
    noteGranularity: overrides.noteGranularity ?? "day",
    content: overrides.content ?? "message",
    tags: overrides.tags ?? [],
    metadataJson: overrides.metadataJson ?? "{}",
    startOffset: overrides.startOffset ?? 10,
    endOffset: overrides.endOffset ?? 20,
    bodyStartOffset: overrides.bodyStartOffset ?? 12,
    createdAt: overrides.createdAt ?? "2026-04-11T10:00:00.000Z",
    noteDate: overrides.noteDate ?? "2026-04-11",
    updatedAt: overrides.updatedAt ?? "2026-04-11T10:00:00.000Z",
    archived: overrides.archived ?? 0,
    deleted: overrides.deleted ?? 0,
    pinned: overrides.pinned ?? 0,
  };
}

const swrWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(
    SWRConfig,
    {
      value: {
        provider: () => new Map(),
        dedupingInterval: 0,
        errorRetryCount: 0,
      },
    },
    children,
  );

describe("usePostBacklinkCounts", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mocked.activeTopic = "work";
    mocked.countMemos.mockReset();
    mocked.getMemos.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("別日付からの backlink を pinned / unpinned 両方に反映する", async () => {
    const pinnedTarget = createPost({
      id: "pinned-target",
      path: "daily/2026-04-09.md",
      metadata: { blockId: "pin-1", pinned: "1" },
    });
    const normalTarget = createPost({
      id: "normal-target",
      path: "daily/2026-04-09.md",
      metadata: { blockId: "plain-1" },
      startOffset: 40,
    });

    mocked.countMemos.mockResolvedValue(2);
    mocked.getMemos.mockResolvedValue([
      createMemoRecord({
        id: "daily/2026-04-10.md:10",
        path: "daily/2026-04-10.md",
        noteName: "2026-04-10",
        content: "[[2026-04-09#^pin-1|pinned]]",
        metadataJson: "{}",
        createdAt: "2026-04-10T08:00:00.000Z",
        noteDate: "2026-04-10",
        updatedAt: "2026-04-10T08:00:00.000Z",
        pinned: 0,
      }),
      createMemoRecord({
        id: "daily/2026-04-11.md:20",
        path: "daily/2026-04-11.md",
        noteName: "2026-04-11",
        content: "[[2026-04-09#^plain-1|plain]]",
        metadataJson: JSON.stringify({ pinned: "1" }),
        startOffset: 20,
        endOffset: 30,
        bodyStartOffset: 22,
        createdAt: "2026-04-11T09:00:00.000Z",
        noteDate: "2026-04-11",
        updatedAt: "2026-04-11T09:00:00.000Z",
        pinned: 1,
      }),
    ]);

    const { result } = renderHook(() => usePostBacklinkCounts([pinnedTarget, normalTarget]), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.get("pinned-target")).toBe(1);
      expect(result.current.get("normal-target")).toBe(1);
    });

    expect(mocked.countMemos).toHaveBeenCalledWith("work");
    expect(mocked.getMemos).toHaveBeenCalledWith({ topicId: "work", limit: 2 });
  });

  it("source 投稿一覧を preview 用に新しい順で返す", async () => {
    const target = createPost({
      id: "target",
      path: "daily/2026-04-09.md",
      metadata: { blockId: "plain-1" },
    });

    mocked.countMemos.mockResolvedValue(2);
    mocked.getMemos.mockResolvedValue([
      createMemoRecord({
        id: "daily/2026-04-10.md:10",
        path: "daily/2026-04-10.md",
        noteName: "2026-04-10",
        content: "[[2026-04-09#^plain-1|older]]",
        createdAt: "2026-04-10T08:00:00.000Z",
        noteDate: "2026-04-10",
        updatedAt: "2026-04-10T08:00:00.000Z",
      }),
      createMemoRecord({
        id: "daily/2026-04-11.md:20",
        path: "daily/2026-04-11.md",
        noteName: "2026-04-11",
        content: "[[2026-04-09#^plain-1|newer]]",
        startOffset: 20,
        endOffset: 30,
        bodyStartOffset: 22,
        createdAt: "2026-04-11T09:00:00.000Z",
        noteDate: "2026-04-11",
        updatedAt: "2026-04-11T09:00:00.000Z",
      }),
    ]);

    const { result } = renderHook(() => usePostBacklinks([target]), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.postsMap.get("target")?.map((post) => post.id)).toEqual([
        "daily/2026-04-11.md:20",
        "daily/2026-04-10.md:10",
      ]);
    });
  });
});
