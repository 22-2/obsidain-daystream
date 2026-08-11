// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { Notice, TFile } from "obsidian";
import { useAppContext } from "src/ui/context/AppContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { postsStore } from "src/ui/store/postsStore";
import { settingsStore } from "src/ui/store/settingsStore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("src/ui/context/AppContext", () => ({
  useAppContext: vi.fn(),
}));

// 意図: usePosts は PostsProvider 必須になったため、provider ツリーを組まずに
// 空の posts を返すモックで代替する（copyBlockIdLink は posts を参照しない）。
vi.mock("src/ui/hooks/usePosts", () => ({
  usePosts: () => ({ posts: [] }),
  PostsProvider: ({ children }: { children: any }) => children,
}));

// 意図: submit 直後の write-through インデックスはこのテストの関心外なので無効化する。
vi.mock("src/db/indexer/tag-indexer", () => ({
  indexNoteContent: vi.fn(async () => {}),
}));

vi.mock("src/ui/context/EditorRefsContext", () => ({
  useEditorRefs: () => ({
    inputRef: { current: null },
    scrollContainerRef: { current: null },
    listHeaderRef: { current: null },
  }),
  EditorRefsProvider: ({ children }: { children: any }) => children,
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
  const today = window.moment("2026-03-15T09:00:00.000Z");
  const testNote = Object.assign(new TFile(), {
    path: "test-note.md",
    basename: "test-note",
    extension: "md",
  }) as any;

  let mockApp: any;
  let mockShell: any;

  beforeEach(() => {
    vi.useRealTimers();

    mockApp = {
      vault: {
        getAbstractFileByPath: vi.fn((path: string) => (path === testNote.path ? testNote : null)),
      },
      fileManager: {
        generateMarkdownLink: vi.fn((file, _path, subpath) => `[[${file.basename}${subpath}]]`),
      },
    };

    mockShell = {
      getVault: vi.fn(() => mockApp.vault),
      getRawApp: vi.fn(() => mockApp),
      loadFile: vi.fn(async () => ""),
      replaceRange: vi.fn().mockResolvedValue(undefined),
    };

    (useAppContext as any).mockReturnValue({
      shell: mockShell,
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    settingsStore.setState({
      granularity: "day",
    });

    postsStore.setState({ tasks: [] });

    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("既存の blockId がある場合はそれを使用してコピーする", async () => {
    const postWithId = {
      id: "post-1",
      message: "hello",
      metadata: { blockId: "existing123" },
      path: testNote.path,
      timestamp: today,
      noteDate: today,
      startOffset: 0,
      endOffset: 10,
    } as any;

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.copyBlockIdLink(postWithId);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("[[test-note#^existing123]]");
    expect(Notice).toHaveBeenCalledWith("ブロックIDリンクをコピーしました");
    expect(mockShell.replaceRange).not.toHaveBeenCalled();
  });

  it("blockId がない場合は新しく生成して保存してからコピーする", async () => {
    const postWithoutId = {
      id: "test-note.md:9",
      message: "no id",
      metadata: {},
      path: testNote.path,
      timestamp: today,
      noteDate: today,
      startOffset: 0,
      endOffset: 5,
    } as any;

    mockShell.loadFile.mockResolvedValue("## Thino\n- 09:00:00 no id\n");

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.copyBlockIdLink(postWithoutId);
    });

    // Verify blockId was generated and saved
    expect(mockShell.replaceRange).toHaveBeenCalledOnce();
    const savedText = mockShell.replaceRange.mock.calls[0][3];
    expect(savedText).toMatch(/\^([0-9a-z]{6})/);

    const generatedId = savedText.match(/\^([0-9a-z]{6})/)[1];
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`[[test-note#^${generatedId}]]`);
    expect(Notice).toHaveBeenCalledWith("ブロックIDリンクをコピーしました");
  });
});
