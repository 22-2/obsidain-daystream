import moment from "moment";
import type { Post } from "src/ui/types";
import {
  buildPostBacklinkCountMap,
  buildTargetPostBacklinkPostsMap,
  extractBlockLinkTargets,
} from "src/ui/utils/post-backlinks";
import { describe, expect, test } from "vitest";

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

describe("post-backlinks", () => {
  test("extractBlockLinkTargets は alias 付き block link を抽出する", () => {
    expect(
      extractBlockLinkTargets("see [[2026-04-09#^a054d5|202604091640415]] and [[#^same-note]]"),
    ).toEqual([
      { noteTarget: "2026-04-09", blockId: "a054d5" },
      { noteTarget: null, blockId: "same-note" },
    ]);
  });

  test("buildPostBacklinkCountMap は basename と path の両方で block link を解決する", () => {
    const target = createPost({
      id: "target",
      path: "daily/2026-04-09.md",
      metadata: { blockId: "a054d5" },
    });
    const sourceA = createPost({
      id: "source-a",
      path: "daily/2026-04-10.md",
      startOffset: 20,
      message: "[[2026-04-09#^a054d5|202604091640415]]\n[[2026-04-09#^a054d5|duplicate]]",
    });
    const sourceB = createPost({
      id: "source-b",
      path: "daily/2026-04-11.md",
      startOffset: 40,
      message: "[[daily/2026-04-09#^a054d5]]",
    });

    const result = buildPostBacklinkCountMap([target, sourceA, sourceB]);

    expect(result.get(target.id)).toBe(2);
  });

  test("buildTargetPostBacklinkPostsMap は duplicate link を source 投稿単位でまとめて返す", () => {
    const target = createPost({
      id: "target",
      path: "daily/2026-04-09.md",
      metadata: { blockId: "a054d5" },
    });
    const olderSource = createPost({
      id: "older-source",
      path: "daily/2026-04-10.md",
      startOffset: 20,
      timestamp: moment("2026-04-10T08:00:00.000Z"),
      message: "[[2026-04-09#^a054d5|older]]",
    });
    const newerSource = createPost({
      id: "newer-source",
      path: "daily/2026-04-11.md",
      startOffset: 40,
      timestamp: moment("2026-04-11T09:00:00.000Z"),
      message: "[[2026-04-09#^a054d5|new]]\n[[2026-04-09#^a054d5|dup]]",
    });

    const result = buildTargetPostBacklinkPostsMap([target], [olderSource, newerSource]);

    expect(result.get(target.id)?.map((post) => post.id)).toEqual(["newer-source", "older-source"]);
  });

  test("同一ノート内の [[#^blockId]] も解決する", () => {
    const target = createPost({
      id: "target",
      path: "daily/2026-04-10.md",
      metadata: { blockId: "same-note-id" },
    });
    const source = createPost({
      id: "source",
      path: "daily/2026-04-10.md",
      startOffset: 20,
      message: "[[#^same-note-id|jump]]",
    });

    const result = buildPostBacklinkCountMap([target, source]);

    expect(result.get(target.id)).toBe(1);
  });

  test("basename が曖昧な場合は誤って backlink を付けない", () => {
    const source = createPost({
      id: "source",
      path: "daily/2026-04-10.md",
      startOffset: 60,
      message: "[[shared#^dup]]",
    });
    const targetA = createPost({
      id: "target-a",
      path: "folder-a/shared.md",
      metadata: { blockId: "dup" },
    });
    const targetB = createPost({
      id: "target-b",
      path: "folder-b/shared.md",
      metadata: { blockId: "dup" },
      startOffset: 80,
    });

    const result = buildPostBacklinkCountMap([source, targetA, targetB]);

    expect(result.size).toBe(0);
  });

  test("非表示 metadata の投稿は backlink 集計に含めない", () => {
    const target = createPost({
      id: "target",
      path: "daily/2026-04-09.md",
      metadata: { blockId: "a054d5" },
    });
    const archivedSource = createPost({
      id: "archived-source",
      path: "daily/2026-04-10.md",
      startOffset: 20,
      metadata: { archived: "1" },
      message: "[[2026-04-09#^a054d5]]",
    });

    const result = buildPostBacklinkCountMap([target, archivedSource]);

    expect(result.size).toBe(0);
  });
});
