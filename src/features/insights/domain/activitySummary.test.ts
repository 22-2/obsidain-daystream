import type { MemoRecord } from "src/core/db/dstr-db";
import {
  buildActivitySummary,
  formatActivityDate,
  normalizeActivityDate,
  type ActivitySummary,
} from "src/features/insights/domain/activitySummary";
import { describe, expect, it } from "vitest";

function record(overrides: Partial<MemoRecord> = {}): MemoRecord {
  return {
    id: "id",
    path: "daily/2026-08-10.md",
    noteName: "2026-08-10",
    topicId: "",
    noteGranularity: "day",
    content: "message",
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

describe("buildActivitySummary", () => {
  it("日別件数と統計を作り、非表示投稿を除外する", () => {
    const result: ActivitySummary = buildActivitySummary(
      [
        record({ id: "a", noteDate: "2026-08-09" }),
        record({ id: "b", noteDate: "2026-08-10" }),
        record({ id: "c", noteDate: "2026-08-10", archived: 1 }),
        record({ id: "d", noteDate: "2026-08-11", deleted: 1 }),
      ],
      null,
      3,
    );

    expect(result.dailyCounts).toEqual({
      "2026-08-09": 1,
      "2026-08-10": 1,
    });
    expect(result.totalPosts).toBe(2);
    expect(result.activeDays).toBe(2);
    expect(result.firstDate).toBe("2026-08-09");
    expect(result.latestDate).toBe("2026-08-10");
    expect(result.tagCount).toBe(3);
  });

  it("選択中のタグだけに絞り込める", () => {
    const result = buildActivitySummary(
      [
        record({ id: "a", noteDate: "2026-08-09", tags: ["work"] }),
        record({ id: "b", noteDate: "2026-08-10", tags: ["home"] }),
      ],
      "work",
      2,
    );

    expect(result.totalPosts).toBe(1);
    expect(result.dailyCounts).toEqual({ "2026-08-09": 1 });
  });

  it("ISO日時をローカル日付へ正規化し、無効なnoteDateはcreatedAtへフォールバックする", () => {
    const result = buildActivitySummary(
      [
        record({
          id: "iso",
          noteDate: "2026-08-10T12:00:00.000Z",
        }),
        record({
          id: "fallback",
          noteDate: "invalid-date",
          createdAt: "2026-08-11T12:00:00.000Z",
        }),
      ],
      null,
      0,
    );

    expect(result.dailyCounts).toEqual({
      "2026-08-10": 1,
      "2026-08-11": 1,
    });
    expect(result.firstDate).toBe("2026-08-10");
    expect(result.latestDate).toBe("2026-08-11");
  });

  it("日付キーを表示用フォーマットへ変換できる", () => {
    expect(normalizeActivityDate("2026-08-10")).toBe("2026-08-10");
    expect(normalizeActivityDate("invalid-date")).toBeNull();
    expect(formatActivityDate("2026-08-10", "YYYY/MM/DD")).toBe("2026/08/10");
  });
});
