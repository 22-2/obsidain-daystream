import { DSTRDatabase, type MemoRecord } from "src/core/db/dstr-db";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const databases: DSTRDatabase[] = [];

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(async () => {
  while (databases.length > 0) {
    const db = databases.pop();
    if (!db) {
      continue;
    }

    db.close();
    await db.delete();
  }
});

function createDatabase() {
  const db = new DSTRDatabase(`test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

function createMemo(overrides: Partial<MemoRecord> = {}): MemoRecord {
  return {
    id: `daily/${overrides.noteDate || "2026-03-23"}.md:${Math.random()}`,
    path: `daily/${overrides.noteDate || "2026-03-23"}.md`,
    noteName: overrides.noteDate || "2026-03-23",
    topicId: "",
    noteGranularity: "day",
    content: "hello",
    tags: [],
    metadataJson: JSON.stringify({}),
    createdAt: `${overrides.noteDate || "2026-03-23"}T10:00:00.000Z`,
    updatedAt: `${overrides.noteDate || "2026-03-23"}T10:00:00.000Z`,
    archived: 0,
    deleted: 0,
    pinned: 0,
    bodyStartOffset: 0,
    startOffset: 0,
    endOffset: 0,
    noteDate: overrides.noteDate || "2026-03-23",
    ...overrides,
  };
}

describe("DSTRDatabase Search", () => {
  test("getLatestVisibleMemos filters by query", async () => {
    const db = createDatabase();
    await db.memos.bulkPut([
      createMemo({ content: "apple pie", noteDate: "2026-03-23" }),
      createMemo({ content: "banana cake", noteDate: "2026-03-24" }),
      createMemo({ content: "apple juice", noteDate: "2026-03-25" }),
    ]);

    const results = await db.getLatestVisibleMemos(undefined, 10, "apple");
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.content)).toContain("apple pie");
    expect(results.map((r) => r.content)).toContain("apple juice");
    expect(results.map((r) => r.content)).not.toContain("banana cake");
  });

  test("getVisibleMemosByDateRange filters by query", async () => {
    const db = createDatabase();
    await db.memos.bulkPut([
      createMemo({ content: "test one", noteDate: "2026-01-01" }),
      createMemo({ content: "test two", noteDate: "2026-01-02" }),
      createMemo({ content: "other", noteDate: "2026-01-03" }),
    ]);

    const results = await db.getVisibleMemosByDateRange({
      startDate: "2026-01-01",
      endDate: "2026-01-05",
      query: "test",
    });

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.content)).toContain("test one");
    expect(results.map((r) => r.content)).toContain("test two");
  });

  test("search is case-insensitive", async () => {
    const db = createDatabase();
    await db.memos.put(createMemo({ content: "Case Insensitive Search" }));

    const results = await db.getLatestVisibleMemos(undefined, 10, "case");
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe("Case Insensitive Search");
  });

  test("searches note paths and tags in addition to content", async () => {
    const db = createDatabase();
    await db.memos.bulkPut([
      createMemo({ content: "plain", path: "projects/reference.md", tags: ["research"] }),
      createMemo({ content: "other", path: "daily/2026-03-23.md", tags: ["journal"] }),
    ]);

    expect(
      (await db.getLatestVisibleMemos(undefined, 10, "reference")).map((r) => r.content),
    ).toEqual(["plain"]);
    expect(
      (await db.getLatestVisibleMemos(undefined, 10, "#journal")).map((r) => r.content),
    ).toEqual(["other"]);
  });

  test("getLatestVisibleMemos filters by threadOnly", async () => {
    const db = createDatabase();
    await db.memos.bulkPut([
      createMemo({
        content: "thread root",
        metadataJson: JSON.stringify({ dstrId: "root-1" }),
      }),
      createMemo({
        content: "thread reply",
        metadataJson: JSON.stringify({ dstrId: "reply-1", parentId: "root-1" }),
      }),
      createMemo({ content: "plain post", metadataJson: JSON.stringify({}) }),
    ]);

    const results = await db.getLatestVisibleMemos(undefined, 10, undefined, true);
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe("thread root");
  });

  test("getVisibleMemosByDateRange combines query and threadOnly", async () => {
    const db = createDatabase();
    await db.memos.bulkPut([
      createMemo({
        content: "apple root",
        noteDate: "2026-01-01",
        metadataJson: JSON.stringify({ dstrId: "root-2" }),
      }),
      createMemo({
        content: "apple reply",
        noteDate: "2026-01-02",
        metadataJson: JSON.stringify({ dstrId: "reply-2", parentId: "root-2" }),
      }),
      createMemo({
        content: "banana root",
        noteDate: "2026-01-03",
        metadataJson: JSON.stringify({ dstrId: "root-3" }),
      }),
    ]);

    const results = await db.getVisibleMemosByDateRange({
      startDate: "2026-01-01",
      endDate: "2026-01-05",
      query: "apple",
      threadOnly: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0].content).toBe("apple root");
  });

  test("getPinnedVisibleMemos returns pinned memos only", async () => {
    const db = createDatabase();
    await db.memos.bulkPut([
      createMemo({
        content: "pinned root",
        noteDate: "2026-01-01",
        pinned: 1,
        metadataJson: JSON.stringify({ dstrId: "root-1" }),
      }),
      createMemo({
        content: "unpinned root",
        noteDate: "2026-01-02",
      }),
      createMemo({
        content: "pinned reply",
        noteDate: "2026-01-03",
        pinned: 1,
        metadataJson: JSON.stringify({ dstrId: "reply-1", parentId: "root-1" }),
      }),
    ]);

    const results = await db.getPinnedVisibleMemos({
      query: "pinned",
      threadOnly: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0].content).toBe("pinned root");
  });
});
