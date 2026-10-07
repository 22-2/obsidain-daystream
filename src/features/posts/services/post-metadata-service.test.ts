import moment from "moment";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import type { Post } from "src/core/domain/post";
import { replaceLatestPostsMetadata } from "src/features/posts/services/post-metadata-service";
import { describe, expect, it, vi } from "vitest";

describe("replaceLatestPostsMetadata", () => {
  it("投稿自身の時刻で書き戻し、ノート日付の 00:00 に丸めない", async () => {
    (window as unknown as { moment: typeof moment }).moment = moment;
    const replaceRange = vi.fn(async () => "");
    const post = {
      id: "p1",
      path: "2026-10-07.md",
      message: "hello",
      metadata: {},
      timestamp: moment("2026-10-07T09:15:30"),
      noteDate: moment("2026-10-07T00:00:00"),
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

    const written = replaceRange.mock.calls[0][3] as string;
    expect(written).toContain("09:15:30");
    expect(written).not.toContain("00:00:00");
  });
});
