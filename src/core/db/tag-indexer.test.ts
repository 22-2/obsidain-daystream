import { DEFAULT_TOPIC } from "src/core/topic";
import type { TFile } from "obsidian";
import { indexNoteContent, TagIndexer } from "src/core/db/indexer/tag-indexer";
import type { IDBService } from "src/core/db/interfaces/IDBService";
import { WorkerClient } from "src/core/db/worker-client";
import {
  createFakeDBService,
  createFakeSettings,
  createFakeShell,
  createFakeTFile,
} from "src/core/test-fixtures";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("src/core/db/worker-client", () => ({
  WorkerClient: {
    get: vi.fn(),
    runWithRecovery: vi.fn(),
  },
}));

function createShell(
  cachedReadFile = vi.fn(async (_file: TFile) => "## Thino\n- 10:00:00 hello"),
) {
  const shell = createFakeShell({
    cachedReadFile,
    getCommunityPlugin: vi.fn(() => undefined),
    getInternalPluginById: vi.fn(() => undefined),
  });
  return { shell, cachedReadFile };
}

function createApiMocks() {
  return {
    scanAllNotes: vi.fn<IDBService["scanAllNotes"]>(async () => {}),
    onFileChanged: vi.fn<IDBService["onFileChanged"]>(async () => {}),
    onFileDeleted: vi.fn<IDBService["onFileDeleted"]>(async () => {}),
    onFileRenamed: vi.fn<IDBService["onFileRenamed"]>(async () => {}),
  };
}

describe("TagIndexer", () => {
  let apiMocks: ReturnType<typeof createApiMocks>;
  let api: ReturnType<typeof createFakeDBService>;

  beforeEach(() => {
    apiMocks = createApiMocks();
    api = createFakeDBService(apiMocks);
    vi.mocked(WorkerClient).get.mockReturnValue(api);
    vi.mocked(WorkerClient).runWithRecovery.mockImplementation(async (operation) => operation(api));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("onFileChanged scans known note files", async () => {
    const indexer = new TagIndexer("vault-1");
    const { shell, cachedReadFile } = createShell();
    const file = createFakeTFile("daily/writing-2026-03.md");

    await indexer.onFileChanged(
      shell,
      file,
      createFakeSettings({
        topics: [DEFAULT_TOPIC, { id: "writing", title: "Writing" }],
      }),
    );

    expect(cachedReadFile).toHaveBeenCalledWith(file);
    expect(apiMocks.onFileChanged).toHaveBeenCalledTimes(1);
    expect(apiMocks.onFileChanged).toHaveBeenCalledWith(
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
    const { shell, cachedReadFile } = createShell();

    await indexer.onFileChanged(
      shell,
      createFakeTFile("misc/random.md"),
      createFakeSettings({ topics: [DEFAULT_TOPIC] }),
    );

    expect(cachedReadFile).not.toHaveBeenCalled();
    expect(apiMocks.onFileChanged).not.toHaveBeenCalled();
  });

  test("onFileDeleted delegates to api", async () => {
    const indexer = new TagIndexer("vault-1");

    await indexer.onFileDeleted("daily/2026-03-23.md");

    expect(apiMocks.onFileDeleted).toHaveBeenCalledWith("daily/2026-03-23.md");
  });

  test("遅延した cachedRead が明示インデックスを巻き戻さない（パス単位直列化）", async () => {
    // 再現シナリオ: vault.create 発火時の cachedRead（空内容）が遅延し、
    // 投稿直後の indexNoteContent(新内容) より後に worker へ届くと、
    // DB が空内容へ巻き戻って「投稿が反映されない」状態になっていた。
    const indexer = new TagIndexer("vault-1");
    const file = createFakeTFile("daily/2026-03-23.md");
    const settings = createFakeSettings({ topics: [DEFAULT_TOPIC] });

    let releaseRead: (() => void) | undefined;
    const { shell } = createShell(
      vi.fn(
        () =>
          new Promise<string>((resolve) => {
            releaseRead = () => resolve("");
          }),
      ),
    );

    // create イベント相当（read が保留のまま）
    const eventIndexing = indexer.onFileChanged(shell, file, settings);
    // 投稿直後の明示インデックス（新内容が確定済み）
    const explicitIndexing = indexNoteContent(shell, file, settings, "- 10:00:00 new post");

    // 保留中の read をここで解決 → 直列化がなければ空内容が後着して上書きする
    await Promise.resolve();
    releaseRead?.();
    await Promise.all([eventIndexing, explicitIndexing]);

    const contents = apiMocks.onFileChanged.mock.calls.map(([note]) => note.content);
    // 最後に worker へ届くのは必ず新しい内容であること
    expect(contents).toEqual(["", "- 10:00:00 new post"]);
  });

  test("scanAllNotes delegates to api", async () => {
    const indexer = new TagIndexer("vault-1", { scanChunkSize: 1 });
    const file = createFakeTFile("daily/2026-03-23.md", "2026-03-23");
    const { shell } = createShell();

    const dailyNotesModule = await import("src/core/platform/daily-notes");
    const getAllTopicNotesSpy = vi
      .spyOn(dailyNotesModule, "getAllTopicNotes")
      .mockImplementation((_, granularity) => {
        const notes: Record<string, TFile> = granularity === "day" ? { day: file } : {};
        return notes;
      });

    await indexer.scanAllNotes(shell, createFakeSettings({ topics: [DEFAULT_TOPIC] }));

    expect(apiMocks.scanAllNotes).toHaveBeenCalledTimes(1);
    getAllTopicNotesSpy.mockRestore();
  });
});
