// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { TFile } from "obsidian";
import * as dailyNotes from "src/lib/daily-notes";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { useEditorRefs } from "src/ui/context/EditorRefsContext";
import { createRefreshPosts } from "src/ui/hooks/internal/refreshPosts";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { appStore as editorStore } from "src/ui/store/appStore";
import { noteStore } from "src/ui/store/noteStore";
import { postsStore } from "src/ui/store/postsStore";
import { settingsStore } from "src/ui/store/settingsStore";
import { THREAD_METADATA_KEYS } from "src/ui/utils/thread-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("src/ui/context/EditorRefsContext", () => ({
  useEditorRefs: vi.fn(),
  EditorRefsProvider: ({ children }: { children: any }) => children,
}));

// 意図: usePosts は PostsProvider 必須になったため、renderHook 単体では
// provider ツリーを組まずに postsStore の内容をそのまま返すモックで代替する。
vi.mock("src/ui/hooks/usePosts", () => ({
  usePosts: () => ({
    posts: (postsStore.getState() as any).posts ?? [],
  }),
  PostsProvider: ({ children }: { children: any }) => children,
}));

// 意図: submit 直後の write-through インデックス（WorkerClient 経由）は
// このテストの関心外なので無効化する。
vi.mock("src/db/indexer/tag-indexer", () => ({
  indexNoteContent: vi.fn(async () => {}),
}));

vi.mock("src/ui/hooks/useUnifiedPosts", () => ({
  useUnifiedPosts: vi.fn(() => ({
    posts: (postsStore.getState() as any).posts ?? [],
    loadMore: vi.fn(),
    hasMore: false,
    isLoading: false,
    isValidating: false,
  })),
}));

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
  useObsidianApp: vi.fn(),
}));

vi.mock("src/lib/daily-notes", async () => {
  const actual = await vi.importActual<typeof import("src/lib/daily-notes")>(
    "src/lib/daily-notes",
  );
  return {
    ...actual,
    getTopicNote: vi.fn(),
    createTopicNote: vi.fn(),
  };
});

vi.mock("./refreshPosts", () => ({
  createRefreshPosts: vi.fn(),
}));

describe("timeline note resolution", () => {
  const today = window.moment("2026-03-15T09:00:00.000Z");
  const yesterday = today.clone().subtract(1, "day");
  const todayNote = Object.assign(new TFile(), {
    path: "2026-03-15.md",
    basename: "2026-03-15",
    extension: "md",
  }) as any;
  const yesterdayNote = Object.assign(new TFile(), {
    path: "2026-03-14.md",
    basename: "2026-03-14",
    extension: "md",
  }) as any;
  let mockApp: any;

  const mockInsertTextAfter = vi.fn();
  // 新規投稿はマーカー保証込みの 1 write 経路（insertTextAfterEnsuringMarker）を通る
  const mockInsertTextAfterEnsuringMarker = vi.fn();
  const mockOpenFile = vi.fn();
  const mockRefreshPosts = vi.fn();
  const mockCreateNoteWithInsertAfter = vi.fn();
  const mockScrollTo = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(today.toDate());
    vi.clearAllMocks();

    mockApp = {
      workspace: {
        getLeaf: vi.fn(() => ({
          openFile: mockOpenFile,
          setViewState: async (viewState: any) => {
            const filePath =
              typeof viewState?.state?.file === "string"
                ? viewState.state.file
                : "";
            const file = mockApp.vault.getAbstractFileByPath(filePath);
            if (file) await mockOpenFile(file);
          },
        })),
      },
      vault: {
        getAbstractFileByPath: vi.fn((path: string) =>
          path === todayNote.path
            ? todayNote
            : path === yesterdayNote.path
              ? yesterdayNote
              : null,
        ),
      },
      getVault: vi.fn(() => ({ adapter: { write: vi.fn() } })),
      writeFile: vi.fn(async () => {}),
      getAbstractFileByPath: vi.fn((path: string) =>
        path === todayNote.path
          ? todayNote
          : path === yesterdayNote.path
            ? yesterdayNote
            : null,
      ),
      getLeaf: vi.fn(() => ({
        openFile: mockOpenFile,
        setViewState: async (viewState: any) => {
          const filePath =
            typeof viewState?.state?.file === "string"
              ? viewState.state.file
              : "";
          const file = mockApp.getAbstractFileByPath(filePath);
          if (file) await mockOpenFile(file);
        },
      })),
      revealLeaf: vi.fn(async () => {}),
      getWorkspace: vi.fn(() => ({ activeEditor: null })),
    };

    (useAppContext as any).mockReturnValue({
      app: mockApp,
      shell: {
        ...mockApp,
        trigger: vi.fn(),
        insertTextAfter: mockInsertTextAfter,
        insertTextAfterEnsuringMarker: mockInsertTextAfterEnsuringMarker,
        replaceRange: vi.fn(),
        loadFile: vi.fn(async () => ""),
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    (createRefreshPosts as any).mockReturnValue(mockRefreshPosts);

    settingsStore.setState({
      pluginSettings: {
        postFormatOption: "Thino",
        insertAfter: "## Thino",
        enabledCardView: true,
        autoToggleSidebar: true,
        debugMode: false,
        allowEditingPastNotes: false,
        updateDateStrategy: "never",
        topics: [],
        activeTopic: "",
        files: [],
        editorExpansionMode: "default",
        fullScanIntervalHours: 24,
        openInNewWindowMode: "always",
        ctrlEnterSends: false,
      },
      activeTopic: "",
      granularity: "day",
      date: yesterday.clone(),
      timeFilter: "all",
      dateFilter: "today",
      sidebarOpen: true,
      displayMode: DISPLAY_MODE.TIMELINE,
      asTask: false,
    });

    postsStore.setState({ tasks: [] });

    editorStore.setState({
      inputSnapshot: "timeline post",
      editingPostOffset: null,
    });

    vi.mocked(useEditorRefs).mockReturnValue({
      inputRef: { current: null },
      scrollContainerRef: {
        current: { scrollTo: mockScrollTo } as unknown as HTMLDivElement,
      },
      listHeaderRef: { current: null },
    });

    noteStore.setState({
      currentDailyNote: yesterdayNote,
      createNoteWithInsertAfter: mockCreateNoteWithInsertAfter,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("タイムライン投稿では過去ノートを見ていても今日のノートを作成して投稿する", async () => {
    vi.mocked(dailyNotes.getTopicNote).mockReturnValue(null);
    mockCreateNoteWithInsertAfter.mockResolvedValue(todayNote);
    mockInsertTextAfterEnsuringMarker.mockResolvedValue("");
    mockRefreshPosts.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateNoteWithInsertAfter).toHaveBeenCalledTimes(1);
    expect(
      mockCreateNoteWithInsertAfter.mock.calls[0][2].isSame(today, "day"),
    ).toBe(true);
    expect(mockInsertTextAfterEnsuringMarker).toHaveBeenCalledWith(
      todayNote,
      expect.stringContaining("timeline post"),
      "## Thino",
    );
    expect(mockRefreshPosts).toHaveBeenCalledWith(todayNote.path);
    expect(editorStore.getState().inputSnapshot).toBe("");
  });

  it("フェンスコードブロック投稿は thino 互換の改行位置で保存する", async () => {
    vi.mocked(dailyNotes.getTopicNote).mockImplementation((_app, date) =>
      date.isSame(today, "day") ? todayNote : null,
    );
    mockInsertTextAfterEnsuringMarker.mockResolvedValue("");
    mockRefreshPosts.mockResolvedValue(undefined);

    editorStore.setState({
      inputSnapshot: "```\nconsole.log('hello')\n```",
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockInsertTextAfterEnsuringMarker).toHaveBeenCalledWith(
      todayNote,
      [
        `- ${today.format("HH:mm:ss")}`,
        "    ```",
        "    console.log('hello')",
        "    ```",
        "",
      ].join("\n"),
      "## Thino",
    );
  });

  it("inputRef が空文字を返しても snapshot の値で canSubmit できる", () => {
    editorStore.setState({
      inputSnapshot: "from-snapshot",
    });

    expect(editorStore.getState().getInputValue()).toBe("from-snapshot");
    expect(editorStore.getState().canSubmit([])).toBe(true);
  });

  it("inputRef が空文字でも handleSubmit は snapshot を投稿する", async () => {
    vi.mocked(dailyNotes.getTopicNote).mockImplementation((_app, date) =>
      date.isSame(today, "day") ? todayNote : null,
    );
    mockInsertTextAfterEnsuringMarker.mockResolvedValue("");
    mockRefreshPosts.mockResolvedValue(undefined);

    editorStore.setState({
      inputSnapshot: "snapshot-post",
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockInsertTextAfterEnsuringMarker).toHaveBeenCalledWith(
      todayNote,
      expect.stringContaining("snapshot-post"),
      "## Thino",
    );
  });

  it("タイムラインで現在のノートを開くは常に今日のノートを開く", async () => {
    vi.mocked(dailyNotes.getTopicNote).mockImplementation((_app, date) =>
      date.isSame(today, "day") ? todayNote : null,
    );

    await noteStore.getState().handleClickOpenDailyNote(mockApp, {
      insertAfter: "## Thino",
    } as any);

    expect(mockCreateNoteWithInsertAfter).not.toHaveBeenCalled();
    expect(mockOpenFile).toHaveBeenCalledWith(todayNote);
  });

  it("タイムラインで今日のノートが無ければ作成してから開く", async () => {
    vi.mocked(dailyNotes.getTopicNote).mockReturnValue(null);
    mockCreateNoteWithInsertAfter.mockResolvedValue(todayNote);

    await noteStore.getState().handleClickOpenDailyNote(mockApp, {
      insertAfter: "## Thino",
    } as any);

    expect(mockCreateNoteWithInsertAfter).toHaveBeenCalledTimes(1);
    expect(
      mockCreateNoteWithInsertAfter.mock.calls[0][2].isSame(today, "day"),
    ).toBe(true);
    expect(mockOpenFile).toHaveBeenCalledWith(todayNote);
  });

  it("スレッド表示中の投稿は親ノートへ返信として保存する", async () => {
    const threadRoot = {
      id: "root-1",
      threadRootId: "root-1",
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "root-1",
      },
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    (postsStore as any).setState({ posts: [threadRoot], tasks: [] });
    settingsStore.setState({
      threadFocusRootId: "root-1",
      displayMode: DISPLAY_MODE.FOCUS,
      date: today.clone(),
    });
    mockInsertTextAfter.mockResolvedValue(undefined);
    mockRefreshPosts.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockInsertTextAfter).toHaveBeenCalledWith(
      expect.objectContaining({ path: yesterdayNote.path }),
      expect.stringContaining("    [parentId::root-1]"),
      "## Thino",
    );
    expect(mockInsertTextAfter.mock.calls[0][1]).toContain(
      "- 23:59:59 timeline post",
    );
    expect(mockInsertTextAfter.mock.calls[0][1]).not.toContain("[mfdiId::");
    expect(mockInsertTextAfter.mock.calls[0][1]).toContain("[posted::");
    expect(mockRefreshPosts).toHaveBeenCalledWith(yesterdayNote.path);
  });

  it("過去編集を許可していれば過去スレッドにも返信できる", async () => {
    const threadRoot = {
      id: "root-past-1",
      threadRootId: "root-past-1",
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "root-past-1",
      },
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    (postsStore as any).setState({ posts: [threadRoot], tasks: [] });
    settingsStore.setState((state) => ({
      ...state,
      pluginSettings: {
        ...state.pluginSettings!,
        allowEditingPastNotes: true,
      },
      threadFocusRootId: "root-past-1",
      displayMode: DISPLAY_MODE.FOCUS,
      date: yesterday.clone(),
    }));
    mockInsertTextAfter.mockResolvedValue(undefined);
    mockRefreshPosts.mockResolvedValue(undefined);

    expect(editorStore.getState().canSubmit([])).toBe(true);

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockInsertTextAfter).toHaveBeenCalledWith(
      expect.objectContaining({ path: yesterdayNote.path }),
      expect.stringContaining("    [parentId::root-past-1]"),
      "## Thino",
    );
    expect(mockRefreshPosts).toHaveBeenCalledWith(yesterdayNote.path);
  });

  it("同日の親ノートへの返信は実時刻で保存する", async () => {
    const todayThreadRoot = {
      id: "root-today-1",
      threadRootId: "root-today-1",
      timestamp: today.clone().hour(8),
      noteDate: today.clone().startOf("day"),
      message: "parent",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "root-today-1",
      },
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: todayNote.path,
    } as any;

    (postsStore as any).setState({ posts: [todayThreadRoot], tasks: [] });
    settingsStore.setState({
      threadFocusRootId: "root-today-1",
      displayMode: DISPLAY_MODE.FOCUS,
      date: today.clone(),
    });
    mockInsertTextAfter.mockResolvedValue(undefined);
    mockRefreshPosts.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockInsertTextAfter.mock.calls[0][1]).toContain(
      `- ${today.format("HH:mm:ss")} timeline post`,
    );
    expect(mockInsertTextAfter.mock.calls[0][1]).not.toContain(
      "- 23:59:59 timeline post",
    );
  });

  it("handleHighlightPost は同じ MFDI タブを focused/day/all へ切り替えて対象投稿をハイライトする", async () => {
    const targetPost = {
      id: `${yesterdayNote.path}:0`,
      threadRootId: null,
      timestamp: yesterday.clone().hour(14).minute(39).second(0),
      noteDate: yesterday.clone().startOf("day"),
      message: "jump target",
      metadata: {},
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    settingsStore.setState((state) => ({
      ...state,
      activeTag: "IT",
      granularity: "month",
      dateFilter: "7d",
      timeFilter: "latest",
      displayMode: DISPLAY_MODE.TIMELINE,
      asTask: true,
      threadOnly: true,
      searchQuery: "abc",
    }));

    editorStore.setState({
      editingPost: {
        ...targetPost,
        id: "editing-post",
        message: "editing",
      },
    });

    (useAppContext as any).mockReturnValue({
      app: mockApp,
      shell: {
        ...mockApp,
        trigger: vi.fn(),
        insertTextAfter: mockInsertTextAfter,
        replaceRange: vi.fn(),
        loadFile: vi.fn(async () =>
          ["## Thino", "- 14:39:00 jump target", ""].join("\n"),
        ),
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleHighlightPost(targetPost);
    });

    const nextState = settingsStore.getState();
    expect(nextState.displayMode).toBe(DISPLAY_MODE.FOCUS);
    expect(nextState.granularity).toBe("day");
    expect(nextState.dateFilter).toBe("today");
    expect(nextState.timeFilter).toBe("all");
    expect(nextState.asTask).toBe(false);
    expect(nextState.threadOnly).toBe(false);
    expect(nextState.activeTag).toBeNull();
    expect(nextState.searchQuery).toBe("");
    expect(nextState.date.isSame(yesterday, "day")).toBe(true);
    expect(editorStore.getState().highlightedPost?.message).toBe("jump target");
    expect(editorStore.getState().editingPost).toBeNull();
  });

  it("スレッド作成では自動でスレッド表示へ切り替える", async () => {
    const plainPost = {
      id: `${yesterdayNote.path}:0`,
      threadRootId: null,
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {},
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    const mockReplaceRange = vi.fn().mockResolvedValue(undefined);
    const content = ["## Thino", "- 12:00:00 parent", ""].join("\n");
    (useAppContext as any).mockReturnValue({
      app: mockApp,
      shell: {
        ...mockApp,
        trigger: vi.fn(),
        insertTextAfter: mockInsertTextAfter,
        replaceRange: mockReplaceRange,
        loadFile: vi.fn(async () => content),
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });
    settingsStore.setState({ threadFocusRootId: null });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.createThread(plainPost);
    });

    expect(mockReplaceRange).toHaveBeenCalledOnce();
    expect(settingsStore.getState().displayMode).toBe(DISPLAY_MODE.FOCUS);
    // スレッド作成後は自動でそのスレッドに切り替わる（root id が設定される）
    const fid = settingsStore.getState().threadFocusRootId;
    expect(typeof fid).toBe("string");
    expect(fid).toMatch(/^[a-f0-9]{8}$/);
    expect(mockReplaceRange.mock.calls[0][3]).toContain("- 12:00:00 parent");
    expect(mockReplaceRange.mock.calls[0][3]).not.toContain(
      "- 23:59:59 parent",
    );
    // 置換されたテキストに実際の mfdiId が含まれていることを確認
    expect(mockReplaceRange.mock.calls[0][3]).toContain(
      `[${THREAD_METADATA_KEYS.ID}::${fid}]`,
    );
  });

  it("スレッド作成は mfdiId がなくても最新オフセットを再発見して置換する", async () => {
    const plainPost = {
      id: `${yesterdayNote.path}:0`,
      threadRootId: null,
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {},
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    const shiftedContent = `## Thino
note header
- 12:00:00 parent
`;

    const mockReplaceRange = vi.fn().mockResolvedValue(undefined);
    (useAppContext as any).mockReturnValue({
      app: mockApp,
      shell: {
        ...mockApp,
        trigger: vi.fn(),
        insertTextAfter: mockInsertTextAfter,
        replaceRange: mockReplaceRange,
        loadFile: vi.fn(async () => shiftedContent),
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.createThread(plainPost);
    });

    expect(mockReplaceRange).toHaveBeenCalledOnce();
    expect(mockReplaceRange.mock.calls[0][1]).toBe(
      shiftedContent.indexOf("- 12:00:00 parent"),
    );
    expect(mockReplaceRange.mock.calls[0][2]).toBeGreaterThan(
      mockReplaceRange.mock.calls[0][1],
    );
  });

  it("タイムラインからスレッド作成した時はフォーカス切替後に再読込する", async () => {
    const plainPost = {
      id: `${yesterdayNote.path}:0`,
      threadRootId: null,
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {},
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    const mockReplaceRange = vi.fn().mockResolvedValue(undefined);
    const content = ["## Thino", "- 12:00:00 parent", ""].join("\n");
    const refreshStateSnapshots: Array<{
      displayMode: string;
      threadFocusRootId: string | null;
      dateIso: string;
    }> = [];

    mockRefreshPosts.mockImplementation(async () => {
      const state = settingsStore.getState();
      refreshStateSnapshots.push({
        displayMode: state.displayMode,
        threadFocusRootId: state.threadFocusRootId,
        dateIso: state.date.toISOString(),
      });
    });

    (useAppContext as any).mockReturnValue({
      app: mockApp,
      shell: {
        ...mockApp,
        trigger: vi.fn(),
        insertTextAfter: mockInsertTextAfter,
        replaceRange: mockReplaceRange,
        loadFile: vi.fn(async () => content),
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    settingsStore.setState({
      displayMode: DISPLAY_MODE.TIMELINE,
      date: today.clone(),
      threadFocusRootId: null,
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.createThread(plainPost);
    });

    expect(mockRefreshPosts).toHaveBeenCalledWith(yesterdayNote.path);
    expect(refreshStateSnapshots).toEqual([
      {
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: expect.stringMatching(/^[a-f0-9]{8}$/),
        dateIso: yesterday.clone().startOf("day").toISOString(),
      },
    ]);
  });

  it("既存スレッドを表示するとフォーカス表示へ切り替わる", async () => {
    const threadRoot = {
      id: "root-1",
      threadRootId: "root-1",
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "root-1",
      },
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    settingsStore.setState({
      displayMode: DISPLAY_MODE.TIMELINE,
      threadFocusRootId: null,
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.createThread(threadRoot);
    });

    expect(settingsStore.getState().displayMode).toBe(DISPLAY_MODE.FOCUS);
    expect(settingsStore.getState().threadFocusRootId).toBe("root-1");
  });

  it("スレッド親を削除すると子もまとめて削除する", async () => {
    const rootPost = {
      id: "root-1",
      threadRootId: "root-1",
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "root-1",
      },
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;
    const replyPost = {
      id: `${yesterdayNote.path}:20`,
      threadRootId: "root-1",
      timestamp: today.clone().hour(1),
      noteDate: yesterday.clone().startOf("day"),
      message: "reply",
      metadata: {
        [THREAD_METADATA_KEYS.PARENT_ID]: "root-1",
        posted: today.toISOString(),
      },
      offset: 20,
      startOffset: 20,
      endOffset: 40,
      bodyStartOffset: 22,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    (postsStore as any).setState({ posts: [replyPost, rootPost], tasks: [] });
    settingsStore.setState({ threadFocusRootId: "root-1" });

    const mockReplaceRange = vi.fn().mockResolvedValue(undefined);
    const content = [
      "## Thino",
      `- 12:00:00 parent [${THREAD_METADATA_KEYS.ID}::root-1]`,
      "- 23:59:59 reply",
      `    [${THREAD_METADATA_KEYS.PARENT_ID}::root-1]`,
      `    [posted::${today.toISOString()}]`,
      "",
    ].join("\n");
    (useAppContext as any).mockReturnValue({
      app: mockApp,
      shell: {
        ...mockApp,
        trigger: vi.fn(),
        insertTextAfter: mockInsertTextAfter,
        replaceRange: mockReplaceRange,
        loadFile: vi.fn(async () => content),
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.deletePost(rootPost);
    });

    expect(mockReplaceRange).toHaveBeenCalledTimes(2);
    expect(mockRefreshPosts).toHaveBeenCalledWith(yesterdayNote.path);
    expect(settingsStore.getState().threadFocusRootId).toBeNull();
  });

  it("mfdiId がある投稿はオフセットがずれても最新位置で削除できる", async () => {
    const rootPost = {
      id: "root-1",
      threadRootId: "root-1",
      timestamp: yesterday.clone().hour(12),
      noteDate: yesterday.clone().startOf("day"),
      message: "parent",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "root-1",
      },
      offset: 0,
      startOffset: 0,
      endOffset: 10,
      bodyStartOffset: 2,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    const replyPost = {
      id: `${yesterdayNote.path}:20`,
      threadRootId: "root-1",
      timestamp: today.clone().hour(1),
      noteDate: yesterday.clone().startOf("day"),
      message: "reply",
      metadata: {
        [THREAD_METADATA_KEYS.PARENT_ID]: "root-1",
        posted: today.toISOString(),
      },
      offset: 20,
      startOffset: 20,
      endOffset: 40,
      bodyStartOffset: 22,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    const shiftedContent = `## Thino
prefix
- 12:00:00 parent
    [${THREAD_METADATA_KEYS.ID}::root-1]
    [${THREAD_METADATA_KEYS.PARENT_ID}::root-1]
- 23:59:59 reply
    [${THREAD_METADATA_KEYS.PARENT_ID}::root-1]
    [posted::${today.toISOString()}]
`;

    (postsStore as any).setState({ posts: [replyPost, rootPost], tasks: [] });
    settingsStore.setState({ threadFocusRootId: "root-1" });

    const mockReplaceRange = vi.fn().mockResolvedValue(undefined);
    (useAppContext as any).mockReturnValue({
      app: mockApp,
      shell: {
        ...mockApp,
        trigger: vi.fn(),
        insertTextAfter: mockInsertTextAfter,
        replaceRange: mockReplaceRange,
        loadFile: vi.fn(async () => shiftedContent),
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.deletePost(rootPost);
    });

    expect(mockReplaceRange).toHaveBeenCalledTimes(2);
    expect(mockReplaceRange.mock.calls[0][1]).toBeGreaterThan(
      rootPost.startOffset,
    );
    expect(mockReplaceRange.mock.calls[1][1]).toBeGreaterThan(
      rootPost.startOffset,
    );
    expect(settingsStore.getState().threadFocusRootId).toBeNull();
  });

  it("永久削除は対象投稿だけを消して前後のデータを壊さない", async () => {
    const targetPost = {
      id: `${yesterdayNote.path}:20`,
      threadRootId: null,
      timestamp: yesterday.clone().hour(10),
      noteDate: yesterday.clone().startOf("day"),
      message: "remove me",
      metadata: {},
      offset: 20,
      startOffset: 20,
      endOffset: 40,
      bodyStartOffset: 22,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    let storedContent = `## Thino
- 09:00:00 keep before
- 10:00:00 remove me
- 11:00:00 keep after
`;

    const mockLoadFile = vi.fn(async () => storedContent);
    const mockReplaceRange = vi.fn(
      async (
        _path: string,
        startOffset: number,
        endOffset: number,
        replacement: string,
      ) => {
        storedContent =
          storedContent.slice(0, startOffset) +
          replacement +
          storedContent.slice(endOffset);
      },
    );
    const mockWrite = vi.fn(async (_path: string, content: string) => {
      storedContent = content;
    });

    mockApp.vault.adapter = {
      write: mockWrite,
    };

    (useAppContext as any).mockReturnValue({
      app: mockApp,
      shell: {
        ...mockApp,
        trigger: vi.fn(),
        insertTextAfter: mockInsertTextAfter,
        replaceRange: mockReplaceRange,
        loadFile: mockLoadFile,
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.permanentlyDeletePost(targetPost);
    });

    expect(mockReplaceRange).toHaveBeenCalledTimes(1);
    expect(storedContent).toBe(`## Thino
- 09:00:00 keep before
- 11:00:00 keep after
`);
    expect(storedContent).not.toContain("remove me");
    expect(storedContent).toContain("keep before");
    expect(storedContent).toContain("keep after");
    expect(mockRefreshPosts).toHaveBeenCalledWith(yesterdayNote.path);
  });

  it("スレッドの永久削除は関連投稿だけを消して他の投稿を壊さない", async () => {
    const rootPost = {
      id: "root-1",
      threadRootId: "root-1",
      timestamp: yesterday.clone().hour(10),
      noteDate: yesterday.clone().startOf("day"),
      message: "thread root",
      metadata: {
        [THREAD_METADATA_KEYS.ID]: "root-1",
      },
      offset: 20,
      startOffset: 20,
      endOffset: 60,
      bodyStartOffset: 22,
      kind: "thino",
      path: yesterdayNote.path,
    } as any;

    let storedContent = `## Thino
- 09:00:00 keep before
- 10:00:00 thread root
    [${THREAD_METADATA_KEYS.ID}::root-1]
- 10:30:00 thread reply
    [${THREAD_METADATA_KEYS.PARENT_ID}::root-1]
    [posted::${today.toISOString()}]
- 11:00:00 keep after
`;

    const mockLoadFile = vi.fn(async () => storedContent);
    const mockReplaceRange = vi.fn(
      async (
        _path: string,
        startOffset: number,
        endOffset: number,
        replacement: string,
      ) => {
        storedContent =
          storedContent.slice(0, startOffset) +
          replacement +
          storedContent.slice(endOffset);
      },
    );
    const mockWrite = vi.fn(async (_path: string, content: string) => {
      storedContent = content;
    });

    mockApp.vault.adapter = {
      write: mockWrite,
    };

    settingsStore.setState({ threadFocusRootId: "root-1" });

    (useAppContext as any).mockReturnValue({
      app: mockApp,
      shell: {
        ...mockApp,
        trigger: vi.fn(),
        insertTextAfter: mockInsertTextAfter,
        replaceRange: mockReplaceRange,
        loadFile: mockLoadFile,
      },
      settings: {
        insertAfter: "## Thino",
        updateDateStrategy: "never",
      },
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.permanentlyDeletePost(rootPost);
    });

    expect(mockReplaceRange).toHaveBeenCalledTimes(2);
    expect(storedContent).toBe(`## Thino
- 09:00:00 keep before
- 11:00:00 keep after
`);
    expect(storedContent).not.toContain("thread root");
    expect(storedContent).not.toContain("thread reply");
    expect(storedContent).toContain("keep before");
    expect(storedContent).toContain("keep after");
    expect(settingsStore.getState().threadFocusRootId).toBeNull();
    expect(mockRefreshPosts).toHaveBeenCalledWith(yesterdayNote.path);
  });
});
