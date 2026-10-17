import { DSTRDatabase, type MemoRecord } from "src/core/db/dstr-db";
import { beforeEach, describe, expect, it, vi } from "vitest";

function createMemo(id: string, createdAt: string): MemoRecord {
  return {
    id,
    path: "daily/2026-03-31.md",
    noteName: "2026-03-31",
    topicId: "",
    noteGranularity: "day",
    content: id,
    tags: [],
    metadataJson: "{}",
    startOffset: 0,
    endOffset: 0,
    bodyStartOffset: 0,
    createdAt,
    noteDate: "2026-03-31",
    updatedAt: createdAt,
    archived: 0,
    deleted: 0,
    pinned: 0,
  };
}

describe("IndexedDB prev bound test", () => {
  let db: DSTRDatabase;

  beforeEach(async () => {
    vi.useRealTimers();
    db = new DSTRDatabase("test-prev-bound");
    await db.open();
    await db.memos.clear();
  });

  it("should return records in prev order using bound range", async () => {
    await db.memos.put(createMemo("1", "2026-03-31T10:00:00.000Z"));
    await db.memos.put(createMemo("2", "2026-03-31T11:00:00.000Z"));

    const startDate = "2026-03-31T00:00:00.000Z";
    const endDate = "2026-03-31T23:59:59.999Z";

    const results = await db.getVisibleMemosByDateRange({
      startDate,
      endDate,
    });

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("2"); // Latest first (prev direction)
    expect(results[1].id).toBe("1");
  });
});
