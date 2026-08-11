import { DEFAULT_TOPIC } from "src/core/topic";
import { indexNoteContent, TagIndexer } from "src/db/indexer/tag-indexer";
import { WorkerClient } from "src/db/worker-client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("src/db/worker-client", () => ({
  WorkerClient: {
    get: vi.fn(),
    runWithRecovery: vi.fn(),
  },
}));

function createShell(overrides: Record<string, unknown> = {}) {
  return {
    cachedReadFile: vi.fn(async () => "## Thino\n- 10:00:00 hello"),
    getCommunityPlugin: vi.fn(() => undefined),
    getInternalPluginById: vi.fn(() => undefined),
    ...overrides,
  } as any;
}

function createApiMock() {
  return {
    scanAllNotes: vi.fn(async () => []),
    onFileChanged: vi.fn(async () => []),
    onFileDeleted: vi.fn(async () => []),
    onFileRenamed: vi.fn(async () => []),
  } as any;
}

describe("TagIndexer", () => {
  let api: any;

  beforeEach(() => {
    api = createApiMock();
    vi.mocked(WorkerClient.get).mockReturnValue(api);
    vi.mocked(WorkerClient.runWithRecovery).mockImplementation(async (operation) => operation(api));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("onFileChanged scans known note files", async () => {
    const indexer = new TagIndexer("vault-1");
    const shell = createShell();
    const file = {
      path: "daily/writing-2026-03.md",
      basename: "writing-2026-03",
    } as any;

    await indexer.onFileChanged(shell, file, {
      topics: [DEFAULT_TOPIC, { id: "writing", title: "Writing" }],
    } as any);

    expect(shell.cachedReadFile).toHaveBeenCalledWith(file);
    expect(api.onFileChanged).toHaveBeenCalledTimes(1);
    expect(api.onFileChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "daily/writing-2026-03.md",
        noteName: "writing-2026-03",
        topicId: "writing",
        noteGranularity: "month",
        content: "## Thino\n- 10:00:00 hello",
      }),
    );
  });

  test("onFileChanged ignores non-note files", async () => {
    const indexer = new TagIndexer("vault-1");
    const shell = createShell();

    await indexer.onFileChanged(
      shell,
      { path: "misc/random.md", basename: "random" } as any,
      { topics: [DEFAULT_TOPIC] } as any,
    );

    expect(shell.cachedReadFile).not.toHaveBeenCalled();
    expect(api.onFileChanged).not.toHaveBeenCalled();
  });

  test("onFileDeleted delegates to api", async () => {
    const indexer = new TagIndexer("vault-1");

    await indexer.onFileDeleted("daily/2026-03-23.md");

    expect(api.onFileDeleted).toHaveBeenCalledWith("daily/2026-03-23.md");
  });

  test("遅延した cachedRead が明示インデックスを巻き戻さない（パス単位直列化）", async () => {
    // 再現シナリオ: vault.create 発火時の cachedRead（空内容）が遅延し、
    // 投稿直後の indexNoteContent(新内容) より後に worker へ届くと、
    // DB が空内容へ巻き戻って「投稿が反映されない」状態になっていた。
    const indexer = new TagIndexer("vault-1");
    const file = {
      path: "daily/2026-03-23.md",
      basename: "2026-03-23",
    } as any;
    const settings = { topics: [DEFAULT_TOPIC] } as any;

    let releaseRead: (() => void) | undefined;
    const shell = createShell({
      cachedReadFile: vi.fn(
        () =>
          new Promise<string>((resolve) => {
            releaseRead = () => resolve("");
          }),
      ),
    });

    // create イベント相当（read が保留のまま）
    const eventIndexing = indexer.onFileChanged(shell, file, settings);
    // 投稿直後の明示インデックス（新内容が確定済み）
    const explicitIndexing = indexNoteContent(shell, file, settings, "- 10:00:00 new post");

    // 保留中の read をここで解決 → 直列化がなければ空内容が後着して上書きする
    await Promise.resolve();
    releaseRead?.();
    await Promise.all([eventIndexing, explicitIndexing]);

    const contents = api.onFileChanged.mock.calls.map((call: any[]) => call[0].content);
    // 最後に worker へ届くのは必ず新しい内容であること
    expect(contents).toEqual(["", "- 10:00:00 new post"]);
  });

  test("scanAllNotes delegates to api", async () => {
    const indexer = new TagIndexer("vault-1", { scanChunkSize: 1 });
    const file = { basename: "2026-03-23", path: "daily/2026-03-23.md" };
    const shell = createShell();

    const dailyNotesModule = await import("src/lib/daily-notes");
    const getAllTopicNotesSpy = vi
      .spyOn(dailyNotesModule, "getAllTopicNotes")
      .mockImplementation(
        (_, granularity) =>
          (granularity === "day" ? { day: file as any } : {}) as Record<string, any>,
      );

    await indexer.scanAllNotes(shell, { topics: [DEFAULT_TOPIC] } as any);

    expect(api.scanAllNotes).toHaveBeenCalledTimes(1);
    getAllTopicNotesSpy.mockRestore();
  });
});
