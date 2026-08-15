import type { MemoRecord } from "src/db/mfdi-db";
import { getInsightRecordCacheKey } from "src/ui/components/insights/insightSummary";
import {
  clearSudachiCache,
  tokenizeInsightRecords,
} from "src/ui/components/insights/sudachi";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function record(overrides: Partial<MemoRecord> = {}): MemoRecord {
  return {
    id: "id",
    path: "daily/2026-08-10.md",
    noteName: "2026-08-10",
    topicId: "topic",
    noteGranularity: "day",
    content: "開発をしています。",
    tags: [],
    metadataJson: "{}",
    startOffset: 0,
    endOffset: 10,
    bodyStartOffset: 0,
    createdAt: "2026-08-10T09:00:00.000Z",
    updatedAt: "2026-08-10T09:00:00.000Z",
    noteDate: "2026-08-10",
    archived: 0,
    deleted: 0,
    pinned: 0,
    ...overrides,
  };
}

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => clearSudachiCache());

describe("tokenizeInsightRecords", () => {
  it("投稿と内容語を対応づける", async () => {
    const first = record({ id: "first" });
    const second = record({ id: "second", content: "分析を試します。" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ words: ["開発"] }, { words: ["分析", "試す"] }],
        }),
      }),
    );

    const result = await tokenizeInsightRecords([first, second]);

    expect(result?.get(getInsightRecordCacheKey(first))).toEqual(["開発"]);
    expect(result?.get(getInsightRecordCacheKey(second))).toEqual(["分析", "試す"]);
  });

  it("サーバーが使えないときは簡易分析へフォールバックする", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(tokenizeInsightRecords([record()])).resolves.toBeNull();
  });

  it("同じ投稿はSudachiサーバーへ再送しない", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ words: ["開発"] }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const memo = record();

    await tokenizeInsightRecords([memo]);
    await tokenizeInsightRecords([memo]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
