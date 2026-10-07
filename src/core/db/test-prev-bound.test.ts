import { MFDIDatabase } from "src/core/db/mfdi-db";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("IndexedDB prev bound test", () => {
  let db: MFDIDatabase;

  beforeEach(async () => {
    vi.useRealTimers();
    db = new MFDIDatabase("test-prev-bound");
    await db.open();
    await db.memos.clear();
  });

  it("should return records in prev order using bound range", async () => {
    await db.memos.put({
      id: "1",
      createdAt: "2026-03-31T10:00:00.000Z",
      archived: 0,
      deleted: 0,
      pinned: 0,
    } as any);
    await db.memos.put({
      id: "2",
      createdAt: "2026-03-31T11:00:00.000Z",
      archived: 0,
      deleted: 0,
      pinned: 0,
    } as any);

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
