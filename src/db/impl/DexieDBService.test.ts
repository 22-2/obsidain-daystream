import { DexieDBService } from "src/db/impl/DexieDBService";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("DexieDBService", () => {
  let service: DexieDBService;

  beforeEach(async () => {
    vi.useRealTimers();
    service = new DexieDBService();
    await service.initialize({ appId: "test-app" });
  });

  it("initialization queues writes that arrive before the database is ready", async () => {
    const uninitializedService = new DexieDBService();
    const note = {
      path: "queued.md",
      noteName: "queued",
      topicId: "topic1",
      noteGranularity: "day" as const,
      noteDate: "2026-03-31",
      content: "## Thino\n- 12:00:00 queued write",
    };

    const write = uninitializedService.onFileChanged(note);
    await uninitializedService.initialize({ appId: "queued-write-test" });
    await write;

    const memos = await uninitializedService.getMemos({ topicId: "topic1" });
    expect(memos.map((memo) => memo.content)).toContain("queued write");

    await uninitializedService.dispose();
  });
  it("should scan and retrieve memos", async () => {
    const note = {
      path: "test.md",
      noteName: "test",
      topicId: "topic1",
      noteGranularity: "day" as const,
      noteDate: "2026-03-31",
      content: "## Thino\n- 12:00:00 hello world",
    };

    await service.scanAllNotes([note]);

    const memos = await service.getMemos({
      topicId: "topic1",
      startDate: "2026-03-31T00:00:00.000Z",
      endDate: "2026-03-31T23:59:59.999Z",
    });

    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe("hello world");
  });

  it("フルスキャンは増分更新済みノートを古いスナップショットで巻き戻さない", async () => {
    // 再現シナリオ: 起動時フルスキャンのスナップショット読み込み中に投稿すると、
    // clear-all 方式ではスキャン完了時に投稿が消えていた。
    const staleSnapshot = {
      path: "daily/2026-03-31.md",
      noteName: "2026-03-31",
      topicId: "topic1",
      noteGranularity: "day" as const,
      noteDate: "2026-03-31",
      content: "## Thino\n- 12:00:00 old",
    };

    // スキャン中に発生した投稿（増分更新）
    await service.onFileChanged({
      ...staleSnapshot,
      content: "## Thino\n- 12:00:00 old\n- 12:01:00 new post",
    });

    // 遅れて届いた古いスナップショット
    await service.scanAllNotes([staleSnapshot]);

    const memos = await service.getMemos({
      topicId: "topic1",
      startDate: "2026-03-31T00:00:00.000Z",
      endDate: "2026-03-31T23:59:59.999Z",
    });

    expect(memos.map((m) => m.content)).toContain("new post");
  });

  it("フルスキャンは削除済みノートを復活させない", async () => {
    const note = {
      path: "daily/2026-03-31.md",
      noteName: "2026-03-31",
      topicId: "topic1",
      noteGranularity: "day" as const,
      noteDate: "2026-03-31",
      content: "## Thino\n- 12:00:00 hello",
    };

    await service.onFileChanged(note);
    // スキャンのスナップショット収集後にノートが削除されたケース
    await service.onFileDeleted(note.path);
    await service.scanAllNotes([note]);

    const memos = await service.getMemos({
      topicId: "topic1",
      startDate: "2026-03-31T00:00:00.000Z",
      endDate: "2026-03-31T23:59:59.999Z",
    });

    expect(memos).toHaveLength(0);
  });

  it("フルスキャンは対象外だった既存ノートを掃除しつつ新規スナップショットを反映する", async () => {
    const oldNote = {
      path: "daily/2026-03-30.md",
      noteName: "2026-03-30",
      topicId: "topic1",
      noteGranularity: "day" as const,
      noteDate: "2026-03-30",
      content: "## Thino\n- 09:00:00 removed offline",
    };
    const newNote = {
      path: "daily/2026-03-31.md",
      noteName: "2026-03-31",
      topicId: "topic1",
      noteGranularity: "day" as const,
      noteDate: "2026-03-31",
      content: "## Thino\n- 12:00:00 hello",
    };

    await service.scanAllNotes([oldNote]);
    // プラグイン停止中に oldNote が消えた想定で、次のスキャンには含まれない
    await service.scanAllNotes([newNote]);

    const memos = await service.getMemos({
      topicId: "topic1",
      startDate: "2026-03-30T00:00:00.000Z",
      endDate: "2026-03-31T23:59:59.999Z",
    });

    expect(memos.map((m) => m.content)).toEqual(["hello"]);
  });

  it("should retrieve memos without topicId", async () => {
    const note = {
      path: "test.md",
      noteName: "test",
      topicId: "topic1",
      noteGranularity: "day" as const,
      noteDate: "2026-03-31",
      content: "## Thino\n- 12:00:00 hello world",
    };

    await service.scanAllNotes([note]);

    const memos = await service.getMemos({
      startDate: "2026-03-31T00:00:00.000Z",
      endDate: "2026-03-31T23:59:59.999Z",
    });

    expect(memos).toHaveLength(1);
  });
});
