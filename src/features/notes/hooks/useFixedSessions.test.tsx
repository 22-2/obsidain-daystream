import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { TFile } from "obsidian";
import React from "react";
import { DSTRStorage } from "src/core/storage";
import { useFixedSessions } from "src/features/notes/hooks/useFixedSessions";
import { AppStoreProvider, createAppStore } from "src/features/workspace/store/appStore";
import {
  getDraftMetadataStorageKey,
  getInputStorageKey,
} from "src/features/composer/store/slices/inputStorage";
import { readLastOpenedFixedSessionNumber } from "src/features/notes/utils/fixed-session-storage";
import type { Post } from "src/core/domain/post";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  shell: {
    getAbstractFileByPath: vi.fn(),
    loadFile: vi.fn(),
    modifyVaultFile: vi.fn(),
    writeFile: vi.fn(),
  },
  confirmDelete: vi.fn(),
  showTextInput: vi.fn(),
}));

vi.mock("src/core/ui/context/AppContext", () => ({
  useAppContext: () => ({ shell: mocked.shell, settings: { insertAfter: "## Thino" } }),
}));

vi.mock("src/features/workspace/hooks/useObsidianUi", () => ({
  useObsidianUi: () => ({
    confirmDelete: mocked.confirmDelete,
    showTextInput: mocked.showTextInput,
  }),
}));

describe("useFixedSessions", () => {
  const path = "MFDI/fixed.md";
  const metaPath = "MFDI/fixed.fixed-session-meta.json";
  let files: Map<string, string>;
  let store: ReturnType<typeof createAppStore>;
  let storage: DSTRStorage;

  beforeEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
    localStorage.clear();
    files = new Map([
      [
        path,
        "## Thino session 1\n- 09:00:00 first\n\n## Thino session 2\n- 10:00:00 second\n\n## Thino session 3\n- 11:00:00 third\n",
      ],
      [metaPath, JSON.stringify({ 2: { name: "作業中", pinned: true } })],
    ]);
    const note = Object.assign(new TFile(), { path });
    mocked.shell.getAbstractFileByPath.mockImplementation((filePath: string) =>
      filePath === path ? note : null,
    );
    mocked.shell.loadFile.mockImplementation(async (filePath: string) => {
      const content = files.get(filePath);
      if (content === undefined) throw new Error("File not found");
      return content;
    });
    mocked.shell.modifyVaultFile.mockImplementation(async (file: TFile, content: string) => {
      files.set(file.path, content);
    });
    mocked.shell.writeFile.mockImplementation(async (filePath: string, content: string) => {
      files.set(filePath, content);
    });
    mocked.confirmDelete.mockResolvedValue(true);
    storage = new DSTRStorage("fixed-sessions-test");
    store = createAppStore();
    store.setState({ storage, viewNoteMode: "fixed", file: path, fixedSessionNumber: 2 });
  });

  afterEach(cleanup);

  function renderSessions() {
    // 意図: 実際のセッション切替と下書き保存を通し、分離後も削除処理の順序を検証する。
    const cache = new Map();
    return renderHook(() => useFixedSessions(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <AppStoreProvider store={store}>
          <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
            {children}
          </SWRConfig>
        </AppStoreProvider>
      ),
    });
  }

  function getSession(sessions: ReturnType<typeof useFixedSessions>, sessionNumber: number) {
    const session = Object.values(sessions.groupedSessions)
      .flat()
      .find((item) => item.sessionNumber === sessionNumber);
    if (!session) throw new Error(`Session ${sessionNumber} not found`);
    return session;
  }

  it("保存したセッション名とピン留めを読み込み、最後の選択を記録する", async () => {
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.shouldShowLoading).toBe(false));

    expect(result.current.noteExists).toBe(true);
    expect(result.current.sessionCount).toBe(3);
    expect(result.current.groupedSessions.pinned).toMatchObject([
      { sessionNumber: 2, title: "作業中" },
    ]);
    expect(readLastOpenedFixedSessionNumber(storage, path)).toBe(2);
  });

  it("現在のセッションを削除しても下書きが復活せず、次のセッションの入力を復元する", async () => {
    store.getState().replaceInput("削除対象の下書き");
    store.getState().setDraftMetadata({ tags: "old" });
    storage.set(getInputStorageKey("fixed", path, 3), "次の下書き");
    storage.set(getDraftMetadataStorageKey("fixed", path, 3), {
      draftMetadata: { tags: "next" },
      draftMetadataBase: {},
    });
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.sessionCount).toBe(3));

    await act(async () => {
      await result.current.handleDeleteSession(result.current.groupedSessions.pinned[0]!);
    });

    expect(store.getState().fixedSessionNumber).toBe(3);
    expect(store.getState().getInputValue()).toBe("次の下書き");
    expect(store.getState().draftMetadata).toEqual({ tags: "next" });
    expect(storage.get(getInputStorageKey("fixed", path, 2), null)).toBeNull();
    expect(storage.get(getDraftMetadataStorageKey("fixed", path, 2), null)).toBeNull();
    expect(files.get(path)).not.toContain("second");
    expect(files.get(path)).toContain("first");
    expect(files.get(path)).toContain("third");
    expect(JSON.parse(files.get(metaPath)!)).not.toHaveProperty("2");
    expect(result.current.sessionCount).toBe(2);
  });

  it("削除をキャンセルしたらノートと選択中の下書きを維持する", async () => {
    mocked.confirmDelete.mockResolvedValue(false);
    store.getState().replaceInput("保持する下書き");
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.sessionCount).toBe(3));

    await act(async () => {
      await result.current.handleDeleteSession(result.current.groupedSessions.pinned[0]!);
    });

    expect(mocked.shell.modifyVaultFile).not.toHaveBeenCalled();
    expect(mocked.shell.writeFile).not.toHaveBeenCalled();
    expect(store.getState().fixedSessionNumber).toBe(2);
    expect(store.getState().getInputValue()).toBe("保持する下書き");
    expect(result.current.sessionCount).toBe(3);
  });

  it("新しい空セッションを保存して選択し、元の下書きを残す", async () => {
    store.getState().replaceInput("元の下書き");
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.sessionCount).toBe(3));

    await act(async () => {
      await result.current.handleCreateSession();
    });

    expect(files.get(path)).toContain("## Thino session 4");
    expect(JSON.parse(files.get(metaPath)!)).toHaveProperty("4.createdAt");
    expect(store.getState().fixedSessionNumber).toBe(4);
    expect(store.getState().getInputValue()).toBe("");
    expect(storage.get(getInputStorageKey("fixed", path, 2), "")).toBe("元の下書き");
    expect(result.current.sessionCount).toBe(4);
  });

  it("作成時に本文を読み込めなければノートと下書きを保持する", async () => {
    store.getState().replaceInput("保持する下書き");
    store.getState().setDraftMetadata({ tags: "keep" });
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.sessionCount).toBe(3));
    const originalFiles = new Map(files);
    // 意図: 一覧取得は成功した後に読み込みが失敗する状況を再現し、
    // 空ノートとして上書きして既存の投稿を失う退行を検出する。
    mocked.shell.loadFile.mockRejectedValueOnce(new Error("Read failed"));

    await act(async () => {
      await result.current.handleCreateSession();
    });

    expect(mocked.shell.modifyVaultFile).not.toHaveBeenCalled();
    expect(mocked.shell.writeFile).not.toHaveBeenCalled();
    expect(files).toEqual(originalFiles);
    expect(store.getState().fixedSessionNumber).toBe(2);
    expect(store.getState().getInputValue()).toBe("保持する下書き");
    expect(store.getState().draftMetadata).toEqual({ tags: "keep" });
    expect(storage.get(getInputStorageKey("fixed", path, 2), "")).toBe("保持する下書き");
    expect(result.current.sessionCount).toBe(3);
  });

  it.each(["作成", "削除"] as const)(
    "%sの本文保存に失敗してもメタデータと選択中の下書きを保持する",
    async (action) => {
      store.getState().replaceInput("保持する下書き");
      store.getState().setDraftMetadata({ tags: "keep" });
      const { result } = renderSessions();
      await waitFor(() => expect(result.current.sessionCount).toBe(3));
      const originalFiles = new Map(files);
      const error = new Error("Write failed");
      mocked.shell.modifyVaultFile.mockRejectedValueOnce(error);

      await act(async () => {
        const operation =
          action === "作成"
            ? result.current.handleCreateSession()
            : result.current.handleDeleteSession(getSession(result.current, 2));
        await expect(operation).rejects.toBe(error);
      });

      expect(files).toEqual(originalFiles);
      expect(mocked.shell.writeFile).not.toHaveBeenCalled();
      expect(store.getState().fixedSessionNumber).toBe(2);
      expect(store.getState().getInputValue()).toBe("保持する下書き");
      expect(store.getState().draftMetadata).toEqual({ tags: "keep" });
      expect(storage.get(getInputStorageKey("fixed", path, 2), "")).toBe("保持する下書き");
      expect(result.current.sessionCount).toBe(3);
    },
  );

  it("Session 1 は確認ダイアログを出さず削除を拒否する", async () => {
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.sessionCount).toBe(3));
    const originalFiles = new Map(files);

    await act(async () => {
      await result.current.handleDeleteSession(getSession(result.current, 1));
    });

    expect(mocked.confirmDelete).not.toHaveBeenCalled();
    expect(mocked.shell.modifyVaultFile).not.toHaveBeenCalled();
    expect(mocked.shell.writeFile).not.toHaveBeenCalled();
    expect(files).toEqual(originalFiles);
    expect(result.current.sessionCount).toBe(3);
  });

  it.each(["作成", "削除"] as const)(
    "編集中は%sを拒否して編集状態を保持する",
    async (action) => {
      const editingPost: Post = {
        id: "editing-post",
        threadRootId: null,
        path,
        timestamp: window.moment(),
        noteDate: window.moment(),
        message: "編集中の投稿",
        metadata: {},
        offset: 0,
        startOffset: 0,
        endOffset: 10,
        bodyStartOffset: 0,
        kind: "thino",
      };
      store.getState().setEditingPost(editingPost);
      store.getState().replaceInput("編集中の入力");
      const { result } = renderSessions();
      await waitFor(() => expect(result.current.sessionCount).toBe(3));

      await act(async () => {
        if (action === "作成") await result.current.handleCreateSession();
        else await result.current.handleDeleteSession(getSession(result.current, 2));
      });

      expect(mocked.confirmDelete).not.toHaveBeenCalled();
      expect(mocked.shell.modifyVaultFile).not.toHaveBeenCalled();
      expect(mocked.shell.writeFile).not.toHaveBeenCalled();
      expect(store.getState().editingPost).toBe(editingPost);
      expect(store.getState().getInputValue()).toBe("編集中の入力");
      expect(store.getState().fixedSessionNumber).toBe(2);
      expect(result.current.sessionCount).toBe(3);
    },
  );

  it("最後のセッションを削除すると前のセッションの下書きへ戻る", async () => {
    storage.set(getInputStorageKey("fixed", path, 2), "前の下書き");
    store.setState({ fixedSessionNumber: 3 });
    store.getState().replaceInput("削除する下書き");
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.sessionCount).toBe(3));

    await act(async () => {
      await result.current.handleDeleteSession(getSession(result.current, 3));
    });

    expect(store.getState().fixedSessionNumber).toBe(2);
    expect(store.getState().getInputValue()).toBe("前の下書き");
    expect(storage.get(getInputStorageKey("fixed", path, 3), null)).toBeNull();
    expect(files.get(path)).not.toContain("third");
    expect(files.get(path)).toContain("second");
    expect(result.current.sessionCount).toBe(2);
  });

  it("別のセッションを削除しても現在の入力とメタデータを維持する", async () => {
    store.getState().replaceInput("現在の入力");
    store.getState().setDraftMetadata({ tags: "keep" });
    storage.set(getInputStorageKey("fixed", path, 3), "削除する下書き");
    storage.set(getDraftMetadataStorageKey("fixed", path, 3), {
      draftMetadata: { tags: "remove" },
      draftMetadataBase: {},
    });
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.sessionCount).toBe(3));

    await act(async () => {
      await result.current.handleDeleteSession(getSession(result.current, 3));
    });

    expect(store.getState().fixedSessionNumber).toBe(2);
    expect(store.getState().getInputValue()).toBe("現在の入力");
    expect(store.getState().draftMetadata).toEqual({ tags: "keep" });
    expect(storage.get(getInputStorageKey("fixed", path, 2), "")).toBe("現在の入力");
    expect(storage.get(getInputStorageKey("fixed", path, 3), null)).toBeNull();
    expect(storage.get(getDraftMetadataStorageKey("fixed", path, 3), null)).toBeNull();
    expect(getSession(result.current, 2).title).toBe("作業中");
    expect(result.current.sessionCount).toBe(2);
  });

  it("名前変更を保存して一覧へ反映し、他のメタデータを維持する", async () => {
    const meta = {
      2: { name: "作業中", pinned: true, createdAt: "2026-03-01T00:00:00.000Z" },
      3: { name: "別のセッション", pinned: false },
    };
    files.set(metaPath, JSON.stringify(meta));
    mocked.showTextInput.mockResolvedValue("  新しい名前  ");
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.sessionCount).toBe(3));

    await act(async () => {
      await result.current.handleRenameSession(getSession(result.current, 2));
    });

    expect(getSession(result.current, 2)).toMatchObject({
      title: "新しい名前",
      pinned: true,
      createdAt: meta[2].createdAt,
    });
    expect(JSON.parse(files.get(metaPath)!)).toEqual({
      ...meta,
      2: { ...meta[2], name: "新しい名前" },
    });
    expect(mocked.shell.modifyVaultFile).not.toHaveBeenCalled();
  });

  it.each(["   ", "Session 2"])("名前を %j にすると既定名へ戻る", async (name) => {
    mocked.showTextInput.mockResolvedValue(name);
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.sessionCount).toBe(3));

    await act(async () => {
      await result.current.handleRenameSession(getSession(result.current, 2));
    });

    expect(getSession(result.current, 2)).toMatchObject({ title: "Session 2", pinned: true });
    expect(JSON.parse(files.get(metaPath)!)[2]).not.toHaveProperty("name");
  });

  it("名前変更をキャンセルしたら保存も再取得も行わない", async () => {
    mocked.showTextInput.mockResolvedValue(null);
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.sessionCount).toBe(3));
    const readCount = mocked.shell.loadFile.mock.calls.length;

    await act(async () => {
      await result.current.handleRenameSession(getSession(result.current, 2));
    });

    expect(mocked.shell.writeFile).not.toHaveBeenCalled();
    expect(mocked.shell.loadFile).toHaveBeenCalledTimes(readCount);
    expect(getSession(result.current, 2).title).toBe("作業中");
  });

  it("ピン留めを解除して再設定しても名前と作成日時と他セッションを維持する", async () => {
    const meta = {
      2: { name: "作業中", pinned: true, createdAt: "2026-03-01T00:00:00.000Z" },
      3: { name: "別のセッション", pinned: false },
    };
    files.set(metaPath, JSON.stringify(meta));
    const { result } = renderSessions();
    await waitFor(() => expect(result.current.sessionCount).toBe(3));

    await act(async () => {
      await result.current.handleTogglePin(2);
    });

    expect(result.current.groupedSessions.pinned).toHaveLength(0);
    expect(getSession(result.current, 2)).toMatchObject({
      title: "作業中",
      pinned: false,
      createdAt: meta[2].createdAt,
    });
    expect(JSON.parse(files.get(metaPath)!)).toEqual({
      ...meta,
      2: { ...meta[2], pinned: false },
    });

    await act(async () => {
      await result.current.handleTogglePin(2);
    });

    expect(result.current.groupedSessions.pinned).toMatchObject([{ sessionNumber: 2 }]);
    expect(JSON.parse(files.get(metaPath)!)).toEqual(meta);
    expect(mocked.shell.modifyVaultFile).not.toHaveBeenCalled();
  });
});
