import type { MemoRecord } from "src/core/db/dstr-db";
import { requestUrl } from "obsidian";
import { getInsightRecordCacheKey } from "src/features/insights/domain/insightSummary";
import {
  clearSudachiCache,
  tokenizeInsightRecords,
} from "src/features/insights/domain/sudachi";
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
beforeEach(() => {
  clearSudachiCache();
  vi.mocked(requestUrl).mockReset();
});

function mockSudachiResponse(words: string[][]): void {
  vi.mocked(requestUrl).mockResolvedValue({
    status: 200,
    headers: {},
    arrayBuffer: new ArrayBuffer(0),
    json: { results: words.map((item) => ({ words: item })) },
    text: "",
  });
}

describe("tokenizeInsightRecords", () => {
  it("投稿と内容語を対応づける", async () => {
    const first = record({ id: "first" });
    const second = record({ id: "second", content: "分析を試します。" });
    mockSudachiResponse([["開発"], ["分析", "試す"]]);

    const result = await tokenizeInsightRecords([first, second]);

    expect(result?.get(getInsightRecordCacheKey(first))).toEqual(["開発"]);
    expect(result?.get(getInsightRecordCacheKey(second))).toEqual(["分析", "試す"]);
  });

  it("サーバーが使えないときは簡易分析へフォールバックする", async () => {
    vi.mocked(requestUrl).mockRejectedValue(new Error("offline"));

    await expect(tokenizeInsightRecords([record()])).resolves.toBeNull();
  });

  it("同じ投稿はSudachiサーバーへ再送しない", async () => {
    mockSudachiResponse([["開発"]]);
    const memo = record();

    await tokenizeInsightRecords([memo]);
    await tokenizeInsightRecords([memo]);

    expect(requestUrl).toHaveBeenCalledTimes(1);
  });
});
