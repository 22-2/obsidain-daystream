import { obsidianMoment } from "src/core/platform/obsidian-globals";
import type { MemoRecord } from "src/core/db/dstr-db";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";
import type { Post } from "src/core/domain/post";
import {
  countVisibleRootPosts,
  createThreadId,
  getThreadPosts,
  isThreadReply,
  isThreadRoot,
  memoRecordToPost,
  resolvePostId,
  resolveThreadRootId,
  sortThreadPosts,
} from "src/features/posts/utils/thread-utils";
import { describe, expect, test } from "vitest";

function createPost(overrides: Partial<Post>): Post {
  const timestamp = overrides.timestamp ?? obsidianMoment("2026-03-15T10:00:00.000Z");
  return {
    id: overrides.id ?? "post-1",
    threadRootId: overrides.threadRootId ?? null,
    timestamp,
    noteDate: overrides.noteDate ?? obsidianMoment("2026-03-15T00:00:00.000Z"),
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

describe("thread-utils", () => {
  test("creates short thread ids", () => {
    expect(createThreadId()).toMatch(/^[a-f0-9]{8}$/);
  });

  test("falls back to path and offset when reply has no dstrId", () => {
    expect(resolvePostId({ parentId: "root-1" }, "daily.md", 20)).toBe("daily.md:20");
  });

  test("resolves thread root id from parentId or dstrId", () => {
    expect(resolveThreadRootId({ parentId: "root-1" })).toBe("root-1");
    expect(resolveThreadRootId({ dstrId: "root-1" })).toBe("root-1");
    expect(
      resolveThreadRootId({ [LEGACY_DAYSTREAM_IDENTIFIERS.threadIdMetadataKey]: "legacy-root" }),
    ).toBe("legacy-root");
  });

  test("counts only root-visible posts", () => {
    const posts = [
      createPost({ id: "root-1", threadRootId: "root-1" }),
      createPost({ id: "reply-1", threadRootId: "root-1", startOffset: 20 }),
      createPost({ id: "plain-1", threadRootId: null, startOffset: 40 }),
    ];

    expect(countVisibleRootPosts(posts)).toBe(2);
    expect(isThreadRoot(posts[0])).toBe(true);
    expect(isThreadReply(posts[1])).toBe(true);
  });

  test("extracts and sorts thread posts in descending order", () => {
    const root = createPost({
      id: "root-1",
      threadRootId: "root-1",
      timestamp: obsidianMoment("2026-03-15T10:00:00.000Z"),
    });
    const laterReply = createPost({
      id: "reply-2",
      threadRootId: "root-1",
      timestamp: obsidianMoment("2026-03-16T01:00:00.000Z"),
      startOffset: 40,
    });
    const earlierReply = createPost({
      id: "reply-1",
      threadRootId: "root-1",
      timestamp: obsidianMoment("2026-03-15T11:00:00.000Z"),
      startOffset: 20,
    });

    const threadPosts = getThreadPosts([laterReply, root, earlierReply], "root-1");
    expect(sortThreadPosts(threadPosts, "root-1").map((post) => post.id)).toEqual([
      "reply-2",
      "reply-1",
      "root-1",
    ]);
  });

  test("memoRecordToPost maps thread root to dstrId so it stays visible", () => {
    const memo: MemoRecord = {
      id: "daily/2026-03-15.md:10",
      path: "daily/2026-03-15.md",
      noteName: "2026-03-15",
      topicId: "",
      noteGranularity: "day",
      content: "root",
      tags: [],
      metadataJson: JSON.stringify({ dstrId: "root-1" }),
      startOffset: 10,
      endOffset: 20,
      bodyStartOffset: 12,
      createdAt: "2026-03-15T10:00:00.000Z",
      noteDate: "2026-03-15",
      updatedAt: "2026-03-15T10:00:00.000Z",
      archived: 0,
      deleted: 0,
      pinned: 0,
    };

    const post = memoRecordToPost(memo);
    expect(post.id).toBe("root-1");
    expect(post.threadRootId).toBe("root-1");
    expect(isThreadRoot(post)).toBe(true);
    expect(isThreadReply(post)).toBe(false);
  });

  test("memoRecordToPost keeps reply id as path:offset when dstrId is absent", () => {
    const memo: MemoRecord = {
      id: "daily/2026-03-15.md:30",
      path: "daily/2026-03-15.md",
      noteName: "2026-03-15",
      topicId: "",
      noteGranularity: "day",
      content: "reply",
      tags: [],
      metadataJson: JSON.stringify({ parentId: "root-1" }),
      startOffset: 30,
      endOffset: 40,
      bodyStartOffset: 32,
      createdAt: "2026-03-15T11:00:00.000Z",
      noteDate: "2026-03-15",
      updatedAt: "2026-03-15T11:00:00.000Z",
      archived: 0,
      deleted: 0,
      pinned: 0,
    };

    const post = memoRecordToPost(memo);
    expect(post.id).toBe("daily/2026-03-15.md:30");
    expect(post.threadRootId).toBe("root-1");
    expect(isThreadReply(post)).toBe(true);
  });
});
