import { MFDIDatabase, type MemoRecord } from "src/core/db/mfdi-db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("MFDIDatabase", () => {
  let db: MFDIDatabase;

  beforeEach(async () => {
    vi.useRealTimers();
    db = new MFDIDatabase("test-app");
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it("should find records with getLatestVisibleMemos", async () => {
    const memo: MemoRecord = {
      id: "1",
      path: "test.md",
      noteName: "test",
      topicId: "topic1",
      noteGranularity: "day",
      content: "hello world",
      tags: ["#test"],
      metadataJson: "{}",
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 0,
      createdAt: "2026-03-31T12:00:00Z",
      noteDate: "2026-03-31",
      updatedAt: "2026-03-31T12:00:00Z",
      archived: 0,
      deleted: 0,
      pinned: 0,
    };

    await db.memos.put(memo);

    const results = await db.getLatestVisibleMemos();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("should find records with getVisibleMemosByDateRange with inclusive range", async () => {
    const memo: MemoRecord = {
      id: "1",
      path: "test.md",
      noteName: "test",
      topicId: "topic1",
      noteGranularity: "day",
      content: "hello world",
      tags: ["#test"],
      metadataJson: "{}",
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 0,
      createdAt: "2026-03-31T12:00:00Z",
      noteDate: "2026-03-31",
      updatedAt: "2026-03-31T12:00:00Z",
      archived: 0,
      deleted: 0,
      pinned: 0,
    };

    await db.memos.put(memo);

    // If we use YYYY-MM-DD as range, it might not match if it's compared lexicographically and we don't have time part in boundaries
    const results = await db.getVisibleMemosByDateRange({
      startDate: "2026-03-31",
      endDate: "2026-04-01", // range covers the day
    });
    expect(results).toHaveLength(1);
  });

  it("should work with complex topicId + date range queries in prev direction", async () => {
    const memo: MemoRecord = {
      id: "1",
      path: "test.md",
      noteName: "test",
      topicId: "topic1",
      noteGranularity: "day",
      content: "hello world",
      tags: ["#test"],
      metadataJson: "{}",
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 0,
      createdAt: "2026-03-31T12:00:00.000Z",
      noteDate: "2026-03-31",
      updatedAt: "2026-03-31T12:00:00.000Z",
      archived: 0,
      deleted: 0,
      pinned: 0,
    };

    await db.memos.put(memo);

    const results = await db.getVisibleMemosByDateRange({
      topicId: "topic1",
      startDate: "2026-03-31T00:00:00.000Z",
      endDate: "2026-03-31T23:59:59.999Z",
    });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("should NOT find records if topicId does not match", async () => {
    const memo: MemoRecord = {
      id: "1",
      path: "test.md",
      noteName: "test",
      topicId: "topic1",
      noteGranularity: "day",
      content: "hello world",
      tags: ["#test"],
      metadataJson: "{}",
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 0,
      createdAt: "2026-03-31T12:00:00.000Z",
      noteDate: "2026-03-31",
      updatedAt: "2026-03-31T12:00:00.000Z",
      archived: 0,
      deleted: 0,
      pinned: 0,
    };

    await db.memos.put(memo);

    const results = await db.getVisibleMemosByDateRange({
      topicId: "topic2",
      startDate: "2026-03-01T00:00:00.000Z",
      endDate: "2026-03-31T23:59:59.999Z",
    });
    expect(results).toHaveLength(0);
  });

  it("can restrict date-range results to daily notes", async () => {
    await db.memos.bulkPut([
      {
        id: "daily",
        path: "daily.md",
        noteName: "daily",
        topicId: "topic1",
        noteGranularity: "day",
        content: "daily post",
        tags: [],
        metadataJson: "{}",
        startOffset: 0,
        endOffset: 10,
        bodyStartOffset: 0,
        createdAt: "2026-03-31T12:00:00.000Z",
        noteDate: "2026-03-31",
        updatedAt: "2026-03-31T12:00:00.000Z",
        archived: 0,
        deleted: 0,
        pinned: 0,
      },
      {
        id: "monthly",
        path: "monthly.md",
        noteName: "monthly",
        topicId: "topic1",
        noteGranularity: "month",
        content: "monthly post",
        tags: [],
        metadataJson: "{}",
        startOffset: 20,
        endOffset: 30,
        bodyStartOffset: 20,
        createdAt: "2026-03-31T13:00:00.000Z",
        noteDate: "2026-03-01",
        updatedAt: "2026-03-31T13:00:00.000Z",
        archived: 0,
        deleted: 0,
        pinned: 0,
      },
    ]);

    const results = await db.getVisibleMemosByDateRange({
      topicId: "topic1",
      startDate: "2026-03-01T00:00:00.000Z",
      endDate: "2026-03-31T23:59:59.999Z",
      noteGranularity: "day",
    });

    expect(results.map((memo) => memo.id)).toEqual(["daily"]);
  });

  it("should NOT find records if archived=1", async () => {
    const memo: MemoRecord = {
      id: "1",
      path: "test.md",
      noteName: "test",
      topicId: "topic1",
      noteGranularity: "day",
      content: "hello world",
      tags: ["#test"],
      metadataJson: "{}",
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 0,
      createdAt: "2026-03-31T12:00:00Z",
      noteDate: "2026-03-31",
      updatedAt: "2026-03-31T12:00:00Z",
      archived: 1,
      deleted: 0,
      pinned: 0,
    };

    await db.memos.put(memo);

    const results = await db.getLatestVisibleMemos();
    expect(results).toHaveLength(0);
  });

  it("should return pinned memos first while keeping createdAt order within each group", async () => {
    await db.memos.bulkPut([
      {
        id: "plain-latest",
        path: "test.md",
        noteName: "test",
        topicId: "topic1",
        noteGranularity: "day",
        content: "plain latest",
        tags: [],
        metadataJson: "{}",
        startOffset: 0,
        endOffset: 10,
        bodyStartOffset: 0,
        createdAt: "2026-03-31T12:00:00.000Z",
        noteDate: "2026-03-31",
        updatedAt: "2026-03-31T12:00:00.000Z",
        archived: 0,
        deleted: 0,
        pinned: 0,
      },
      {
        id: "pinned-earlier",
        path: "test.md",
        noteName: "test",
        topicId: "topic1",
        noteGranularity: "day",
        content: "pinned earlier",
        tags: [],
        metadataJson: '{"pinned":"1"}',
        startOffset: 20,
        endOffset: 30,
        bodyStartOffset: 20,
        createdAt: "2026-03-31T09:00:00.000Z",
        noteDate: "2026-03-31",
        updatedAt: "2026-03-31T09:00:00.000Z",
        archived: 0,
        deleted: 0,
        pinned: 1,
      },
      {
        id: "pinned-latest",
        path: "test.md",
        noteName: "test",
        topicId: "topic1",
        noteGranularity: "day",
        content: "pinned latest",
        tags: [],
        metadataJson: '{"pinned":"1"}',
        startOffset: 40,
        endOffset: 50,
        bodyStartOffset: 40,
        createdAt: "2026-03-31T11:00:00.000Z",
        noteDate: "2026-03-31",
        updatedAt: "2026-03-31T11:00:00.000Z",
        archived: 0,
        deleted: 0,
        pinned: 1,
      },
    ]);

    const results = await db.getLatestVisibleMemos();
    expect(results.map((memo) => memo.id)).toEqual([
      "pinned-latest",
      "pinned-earlier",
      "plain-latest",
    ]);
  });
});
