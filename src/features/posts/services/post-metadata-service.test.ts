import { obsidianMoment } from "src/core/platform/obsidian-globals";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import type { Post } from "src/core/domain/post";
import {
  findLatestPostInNote,
  replaceLatestPostsMetadata,
} from "src/features/posts/services/post-metadata-service";
import { describe, expect, it, vi } from "vitest";

describe("replaceLatestPostsMetadata", () => {
  it("投稿自身の時刻で書き戻し、ノート日付の 00:00 に丸めない", async () => {
    Reflect.set(window, "moment", obsidianMoment);
    const replaceRange = vi.fn<ObsidianAppShell["replaceRange"]>(async () => "");
    const post = {
      id: "p1",
      path: "2026-10-07.md",
      message: "hello",
      metadata: {},
      timestamp: obsidianMoment("2026-10-07T09:15:30"),
      noteDate: obsidianMoment("2026-10-07T00:00:00"),
      startOffset: 10,
      endOffset: 30,
    } as unknown as Post;

    await replaceLatestPostsMetadata({
      shell: { replaceRange } as unknown as ObsidianAppShell,
      granularity: "day",
      posts: [post],
      resolveLatest: async (p) => p,
      buildMetadata: () => ({ deleted: "20261007120000" }),
    });

    const written = replaceRange.mock.calls[0][3];
    expect(written).toContain("09:15:30");
    expect(written).not.toContain("00:00:00");
  });

  it("表示中の粒度ではなく投稿元ノートの粒度で時刻を書く", async () => {
    Reflect.set(window, "moment", obsidianMoment);
    const replaceRange = vi.fn<ObsidianAppShell["replaceRange"]>(async () => "");
    const post = {
      id: "p1",
      path: "2026-10-07.md",
      message: "hello",
      metadata: {},
      noteGranularity: "day",
      timestamp: obsidianMoment("2026-10-07T09:15:30"),
      noteDate: obsidianMoment("2026-10-07T00:00:00"),
      startOffset: 10,
      endOffset: 30,
    } as unknown as Post;

    await replaceLatestPostsMetadata({
      shell: { replaceRange } as unknown as ObsidianAppShell,
      granularity: "month",
      posts: [post],
      resolveLatest: async (p) => p,
      buildMetadata: () => ({ pinned: "1" }),
    });

    const written = replaceRange.mock.calls[0][3];
    expect(written.startsWith("- 09:15:30 hello")).toBe(true);
  });
});

describe("findLatestPostInNote", () => {
  it("ノートを読み直しても投稿元ノートの粒度を引き継ぐ", async () => {
    Reflect.set(window, "moment", obsidianMoment);
    const loadFile = vi.fn<ObsidianAppShell["loadFile"]>(async () => "## Thino\n- 09:15:30 hello\n");
    const post = {
      id: "missing-id",
      path: "2026-10-07.md",
      message: "hello",
      metadata: {},
      noteGranularity: "day",
      timestamp: obsidianMoment("2026-10-07T09:15:30"),
      noteDate: obsidianMoment("2026-10-07T00:00:00"),
    } as unknown as Post;

    const latest = await findLatestPostInNote({
      shell: { loadFile } as unknown as ObsidianAppShell,
      insertAfter: "",
      noteMode: "periodic",
      post,
    });

    expect(latest?.noteGranularity).toBe("day");
  });
});
