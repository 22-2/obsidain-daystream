// @vitest-environment jsdom
import { act, renderHook as renderHookBase } from "@testing-library/react";
import React from "react";
import { Notice, TFile } from "obsidian";
import type { App, Vault } from "obsidian";
import type { Post } from "src/core/domain/post";
import { DEFAULT_SETTINGS } from "src/core/domain/settings";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import type { DSTRStorage } from "src/core/storage";
import { obsidianMoment } from "src/core/platform/obsidian-globals";
import { indexNoteContent } from "src/core/db/indexer/tag-indexer";
import { useAppContext } from "src/core/ui/context/AppContext";
import { usePostActions } from "src/features/posts/hooks/internal/usePostActions";
import { AppStoreProvider, appStore as editorStore } from "src/features/workspace/store/appStore";
import { tasksStore } from "src/features/tasks/store/tasksStore";
import { settingsStore } from "src/features/workspace/store/settingsStore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const StoreWrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AppStoreProvider, { store: editorStore, children });

const renderHook = (callback: () => ReturnType<typeof usePostActions>) =>
  renderHookBase(callback, { wrapper: StoreWrapper });

vi.mock("swr", () => ({
  default: (_key: unknown, _fetcher?: unknown) => ({
    data: undefined,
    mutate: vi.fn(),
    isValidating: false,
    isLoading: false,
    error: undefined,
  }),
  mutate: vi.fn(),
}));

vi.mock("src/core/ui/context/AppContext", () => ({
  useAppContext: vi.fn(),
}));

// 意図: usePosts は PostsProvider 必須になったため、provider ツリーを組まずに
// 空の posts を返すモックで代替する（copyBlockIdLink は posts を参照しない）。
vi.mock("src/features/posts/hooks/usePosts", () => ({
  usePosts: () => ({ posts: [] }),
  PostsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// 意図: submit 直後の write-through インデックスはこのテストの関心外なので無効化する。
vi.mock("src/core/db/indexer/tag-indexer", () => ({
  indexNoteContent: vi.fn(async () => {}),
}));

vi.mock("src/features/composer/context/EditorRefsContext", () => ({
  useEditorRefs: () => ({
    inputRef: { current: null },
    scrollContainerRef: { current: null },
    listHeaderRef: { current: null },
  }),
  EditorRefsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("./refreshPosts", () => ({
  createRefreshPosts: vi.fn(() => vi.fn()),
}));

vi.mock("obsidian", async () => {
  const actual = await vi.importActual<typeof import("obsidian")>("obsidian");
  return {
    ...actual,
    Notice: vi.fn(),
  };
});

describe("usePostActions - copyBlockIdLink", () => {
  const today = obsidianMoment("2026-03-15T09:00:00.000Z");
  const testNote = Object.assign(new TFile(), {
    path: "test-note.md",
    basename: "test-note",
    extension: "md",
  });

  const getAbstractFileByPath = vi.fn<(path: string) => TFile | null>((path) =>
    path === testNote.path ? testNote : null,
  );
  const generateMarkdownLink = vi.fn<(file: TFile, sourcePath: string, subpath?: string) => string>(
    (file, _sourcePath, subpath) => `[[${file.basename}${subpath ?? ""}]]`,
  );
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});
  const loadFile = vi.fn<ObsidianAppShell["loadFile"]>(async () => "");
  const replaceRange = vi.fn<ObsidianAppShell["replaceRange"]>(async () => "");

  // 意図: ObsidianAppShell はクラスで内部状態を持つため、このテストが使う公開メソッドだけを持つ偽物を作り、境界で一度だけキャストする。
  const createShell = (): ObsidianAppShell => {
    const vault = { getAbstractFileByPath } as unknown as Vault;
    const rawApp = { fileManager: { generateMarkdownLink } } as unknown as App;
    return {
      getVault: () => vault,
      getRawApp: () => rawApp,
      getAbstractFileByPath,
      loadFile,
      replaceRange,
    } as unknown as ObsidianAppShell;
  };

  beforeEach(() => {
    vi.useRealTimers();

    vi.mocked(useAppContext).mockReturnValue({
      shell: createShell(),
      // 意図: このテストの対象は storage を参照しないため、空の値で代替する。
      storage: {} as DSTRStorage,
      settings: { ...DEFAULT_SETTINGS, insertAfter: "## Thino", updateDateStrategy: "never" },
    });

    settingsStore.setState({
      granularity: "day",
    });

    tasksStore.setState({ tasks: [] });

    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: { writeText },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("既存の blockId がある場合はそれを使用してコピーする", async () => {
    const postWithId: Post = {
      id: "post-1",
      threadRootId: null,
      message: "hello",
      metadata: { blockId: "existing123" },
      path: testNote.path,
      timestamp: today,
      noteDate: today,
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 0,
      kind: "thino",
    };

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.copyBlockIdLink(postWithId);
    });

    expect(writeText).toHaveBeenCalledWith("[[test-note#^existing123]]");
    expect(Notice).toHaveBeenCalledWith("ブロックIDリンクをコピーしました");
    expect(replaceRange).not.toHaveBeenCalled();
  });

  it("blockId がない場合は新しく生成して保存してからコピーする", async () => {
    const postWithoutId: Post = {
      id: "test-note.md:9",
      threadRootId: null,
      message: "no id",
      metadata: {},
      path: testNote.path,
      timestamp: today,
      noteDate: today,
      offset: 0,
      startOffset: 0,
      endOffset: 5,
      bodyStartOffset: 0,
      kind: "thino",
    };

    loadFile.mockResolvedValue("## Thino\n- 09:00:00 no id\n");
    replaceRange.mockResolvedValueOnce("written content");

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.copyBlockIdLink(postWithoutId);
    });

    // Verify blockId was generated and saved
    expect(replaceRange).toHaveBeenCalledOnce();
    const savedText = replaceRange.mock.calls[0][3];
    expect(savedText).toMatch(/\^([0-9a-z]{6})/);

    const generatedId = /\^([0-9a-z]{6})/.exec(savedText)?.[1] ?? "";
    expect(generatedId).toHaveLength(6);
    // 書き込んだ全文で、再検証より前にDBへ反映する。
    expect(indexNoteContent).toHaveBeenCalledWith(
      expect.anything(),
      testNote,
      expect.anything(),
      "written content",
    );
    expect(writeText).toHaveBeenCalledWith(`[[test-note#^${generatedId}]]`);
    expect(Notice).toHaveBeenCalledWith("ブロックIDリンクをコピーしました");
  });
});
