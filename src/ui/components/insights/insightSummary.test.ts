import type { MemoRecord } from "src/db/mfdi-db";
import {
  buildInsightSummary,
  clearInsightCache,
  getTopCounts,
  getWordTrend,
} from "src/ui/components/insights/insightSummary";
import { beforeEach, describe, expect, it } from "vitest";

function record(overrides: Partial<MemoRecord> = {}): MemoRecord {
  return {
    id: "id",
    path: "daily/2026-08-10.md",
    noteName: "2026-08-10",
    topicId: "topic",
    noteGranularity: "day",
    content: "投稿",
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

describe("buildInsightSummary", () => {
  beforeEach(() => clearInsightCache());

  it("可視投稿を集計し、連続日数と月次指標を作る", () => {
    const summary = buildInsightSummary([
      record({
        id: "a",
        noteDate: "2026-08-10",
        content: "画像 ![alt](image.png) [[2026-08-09#^post-a]]",
      }),
      record({
        id: "b",
        noteDate: "2026-08-11",
        createdAt: "2026-08-11T18:00:00.000Z",
        content: "https://example.com/path",
      }),
      record({ id: "hidden", noteDate: "2026-08-12", archived: 1 }),
    ]);

    expect(summary.totalPosts).toBe(2);
    expect(summary.activeDays).toBe(2);
    expect(summary.longestStreak).toBe(2);
    expect(summary.currentStreak).toBe(2);
    expect(summary.firstDate).toBe("2026-08-10");
    expect(summary.latestDate).toBe("2026-08-11");
    expect(summary.monthlyStats["2026"][7]).toMatchObject({
      posts: 2,
      imageRate: 50,
      referenceRate: 50,
    });
    expect(summary.linkDomains["2026"]).toEqual({ "example.com": 1 });
  });

  it("選択中タグで集計対象を絞れる", () => {
    const summary = buildInsightSummary(
      [
        record({ id: "work", tags: ["work"] }),
        record({ id: "home", tags: ["home"], noteDate: "2026-08-11" }),
      ],
      "work",
    );

    expect(summary.totalPosts).toBe(1);
    expect(summary.activeDays).toBe(1);
  });

  it("頻出語と語トレンドを返す", () => {
    const summary = buildInsightSummary([
      record({ id: "a", content: "開発 開発 https://example.com" }),
      record({
        id: "b",
        noteDate: "2026-09-01",
        content: "開発 [[daily#^post]] #タグ @someone.example",
      }),
    ]);

    expect(getTopCounts(summary.wordCounts["2026"], 1)[0]?.word).toBe("開発");
    expect(getWordTrend(summary, "開発")).toEqual([
      { word: "2026-08", count: 2 },
      { word: "2026-09", count: 1 },
    ]);
    expect(getWordTrend(summary, "開発", "2026")).toEqual([
      { word: "2026-08", count: 2 },
      { word: "2026-09", count: 1 },
    ]);
  });
});
