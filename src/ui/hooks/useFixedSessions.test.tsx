import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { TFile } from "obsidian";
import React from "react";
import { MFDIStorage } from "src/core/storage";
import { useFixedSessions } from "src/ui/hooks/useFixedSessions";
import { AppStoreProvider, createAppStore } from "src/ui/store/appStore";
import {
  getDraftMetadataStorageKey,
  getInputStorageKey,
} from "src/ui/store/slices/inputStorage";
import { readLastOpenedFixedSessionNumber } from "src/ui/utils/fixed-session-storage";
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

vi.mock("src/ui/context/AppContext", () => ({
  useAppContext: () => ({ shell: mocked.shell, settings: { insertAfter: "## Thino" } }),
}));

vi.mock("src/ui/hooks/useObsidianUi", () => ({
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
  let storage: MFDIStorage;

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
    storage = new MFDIStorage("fixed-sessions-test");
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
});
