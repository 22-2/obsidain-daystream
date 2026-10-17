// @vitest-environment jsdom
import { act, renderHook as renderHookBase } from "@testing-library/react";
import React from "react";
import { TFile } from "obsidian";
import type { Post } from "src/core/domain/post";
import type { Settings } from "src/core/domain/settings";
import type { DSTRStorage } from "src/core/storage";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { obsidianMoment } from "src/core/platform/obsidian-globals";
import type { NoteSlice } from "src/features/notes/store/types";
import * as dailyNotes from "src/core/platform/daily-notes";
import { DISPLAY_MODE } from "src/features/workspace/config/constants";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useEditorRefs } from "src/features/composer/context/EditorRefsContext";
import { createRefreshPosts } from "src/features/posts/hooks/internal/refreshPosts";
import { usePostActions } from "src/features/posts/hooks/internal/usePostActions";
import { AppStoreProvider, appStore as editorStore } from "src/features/workspace/store/appStore";
import { noteStore } from "src/features/notes/store/noteStore";
import { tasksStore } from "src/features/tasks/store/tasksStore";
import { settingsStore } from "src/features/workspace/store/settingsStore";
import { THREAD_METADATA_KEYS } from "src/features/posts/utils/thread-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 意図: usePosts / useUnifiedPosts のモックが返す投稿一覧。テストごとに投稿を差し替える。
const postsFixture = vi.hoisted(() => ({ posts: [] as Post[] }));

type ShellMethods = Pick<
  ObsidianAppShell,
  "insertTextAfter" | "insertTextAfterEnsuringMarker" | "replaceRange" | "loadFile"
>;
type WriteFile = (path: string, content: string) => Promise<void>;

const loadFileReturning = (content: string) =>
  vi.fn<ObsidianAppShell["loadFile"]>(async () => content);

const createTestSettings = (): Settings => ({
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
  ctrlEnterSends: "disabled",
});

const StoreWrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AppStoreProvider, { store: editorStore, children });

const renderHook = (callback: () => ReturnType<typeof usePostActions>) =>
  renderHookBase(callback, { wrapper: StoreWrapper });

vi.mock("src/features/composer/context/EditorRefsContext", () => ({
  useEditorRefs: vi.fn(),
  EditorRefsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// 意図: usePosts は PostsProvider 必須になったため、renderHook 単体では
// provider ツリーを組まずに postsFixture の内容をそのまま返すモックで代替する。
vi.mock("src/features/posts/hooks/usePosts", () => ({
  usePosts: () => ({ posts: postsFixture.posts }),
  PostsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// 意図: submit 直後の write-through インデックス（WorkerClient 経由）は
// このテストの関心外なので無効化する。
vi.mock("src/core/db/indexer/tag-indexer", () => ({
  indexNoteContent: vi.fn(async () => {}),
}));

vi.mock("src/features/posts/hooks/useUnifiedPosts", () => ({
  useUnifiedPosts: vi.fn(() => ({
    posts: postsFixture.posts,
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

vi.mock("src/core/ui/context/AppContext", () => ({
  useAppContext: vi.fn(),
  useObsidianApp: vi.fn(),
}));

vi.mock("src/core/platform/daily-notes", async () => {
  const actual = await vi.importActual<typeof import("src/core/platform/daily-notes")>("src/core/platform/daily-notes");
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
  const today = obsidianMoment("2026-03-15T09:00:00.000Z");
  const yesterday = today.clone().subtract(1, "day");
  const todayNote = Object.assign(new TFile(), {
    path: "2026-03-15.md",
    basename: "2026-03-15",
    extension: "md",
  });
  const yesterdayNote = Object.assign(new TFile(), {
    path: "2026-03-14.md",
    basename: "2026-03-14",
    extension: "md",
  });
  const findNote = (path: string): TFile | null =>
    path === todayNote.path ? todayNote : path === yesterdayNote.path ? yesterdayNote : null;

  const mockInsertTextAfter = vi.fn<ObsidianAppShell["insertTextAfter"]>();
  // 新規投稿はマーカー保証込みの 1 write 経路（insertTextAfterEnsuringMarker）を通る
  const mockInsertTextAfterEnsuringMarker = vi.fn<ObsidianAppShell["insertTextAfterEnsuringMarker"]>();
  const mockOpenFile = vi.fn<(file: TFile) => Promise<void>>();
  const mockRefreshPosts = vi.fn<ReturnType<typeof createRefreshPosts>>();
  const mockCreateNoteWithInsertAfter = vi.fn<NoteSlice["createNoteWithInsertAfter"]>();
  const mockScrollTo = vi.fn<(options?: ScrollToOptions) => void>();

  const createLeaf = () => ({
    openFile: mockOpenFile,
    setViewState: async (viewState: { state?: { file?: unknown } }) => {
      const filePath = typeof viewState.state?.file === "string" ? viewState.state.file : "";
      const file = findNote(filePath);
      if (file) await mockOpenFile(file);
    },
  });

  const buildMockApp = () => ({
    workspace: {
      getLeaf: vi.fn(createLeaf),
    },
    vault: {
      getAbstractFileByPath: vi.fn(findNote),
      adapter: { write: vi.fn<WriteFile>() },
    },
    getVault: vi.fn(() => ({ adapter: { write: vi.fn<WriteFile>() } })),
    writeFile: vi.fn<WriteFile>(async () => {}),
    getAbstractFileByPath: vi.fn(findNote),
    getLeaf: vi.fn(createLeaf),
    revealLeaf: vi.fn(async () => {}),
    getWorkspace: vi.fn(() => ({ activeEditor: null })),
  });
  let mockApp: ReturnType<typeof buildMockApp>;

  // 意図: ObsidianAppShell は protected な内部状態を持つクラスなので、テストでは必要なメソッドだけ持つ偽物を境界でキャストする。
  const createShell = (overrides: Partial<ShellMethods> = {}): ObsidianAppShell =>
    ({
      ...mockApp,
      trigger: vi.fn(),
      insertTextAfter: mockInsertTextAfter,
      insertTextAfterEnsuringMarker: mockInsertTextAfterEnsuringMarker,
      replaceRange: vi.fn<ObsidianAppShell["replaceRange"]>(),
      loadFile: loadFileReturning(""),
      ...overrides,
    }) as unknown as ObsidianAppShell;

  const mockAppContext = (overrides: Partial<ShellMethods> = {}) => {
    vi.mocked(useAppContext).mockReturnValue({
      shell: createShell(overrides),
      // 意図: このテストの対象は storage を参照しないため、空の値で代替する。
      storage: {} as DSTRStorage,
      settings: createTestSettings(),
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(today.toDate());
    vi.clearAllMocks();

    mockApp = buildMockApp();
    postsFixture.posts = [];
    mockAppContext();

    vi.mocked(createRefreshPosts).mockReturnValue(mockRefreshPosts);

    settingsStore.setState({
      pluginSettings: createTestSettings(),
      activeTopic: "",
      granularity: "day",
      date: yesterday.clone(),
      timeFilter: "all",
      dateFilter: "today",
      sidebarOpen: true,
      displayMode: DISPLAY_MODE.TIMELINE,
      asTask: false,
    });

    tasksStore.setState({ tasks: [] });

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
    expect(mockCreateNoteWithInsertAfter.mock.calls[0][2]?.isSame(today, "day")).toBe(true);
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
      [`- ${today.format("HH:mm:ss")}`, "    ```", "    console.log('hello')", "    ```", ""].join(
        "\n",
      ),
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

    await noteStore.getState().handleClickOpenDailyNote(createShell(), createTestSettings());

    expect(mockCreateNoteWithInsertAfter).not.toHaveBeenCalled();
    expect(mockOpenFile).toHaveBeenCalledWith(todayNote);
  });

  it("タイムラインで今日のノートが無ければ作成してから開く", async () => {
    vi.mocked(dailyNotes.getTopicNote).mockReturnValue(null);
    mockCreateNoteWithInsertAfter.mockResolvedValue(todayNote);

    await noteStore.getState().handleClickOpenDailyNote(createShell(), createTestSettings());

    expect(mockCreateNoteWithInsertAfter).toHaveBeenCalledTimes(1);
    expect(mockCreateNoteWithInsertAfter.mock.calls[0][2]?.isSame(today, "day")).toBe(true);
    expect(mockOpenFile).toHaveBeenCalledWith(todayNote);
  });

  it("スレッド表示中の投稿は親ノートへ返信として保存する", async () => {
    const threadRoot: Post = {
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
    };

    postsFixture.posts = [threadRoot];
    settingsStore.setState({
      threadFocusRootId: "root-1",
      displayMode: DISPLAY_MODE.FOCUS,
      date: today.clone(),
    });
    mockInsertTextAfter.mockResolvedValue("");
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
    expect(mockInsertTextAfter.mock.calls[0][1]).toContain("- 23:59:59 timeline post");
    expect(mockInsertTextAfter.mock.calls[0][1]).not.toContain("[dstrId::");
    expect(mockInsertTextAfter.mock.calls[0][1]).toContain("[posted::");
    expect(mockRefreshPosts).toHaveBeenCalledWith(yesterdayNote.path);
  });

  it("過去編集を許可していれば過去スレッドにも返信できる", async () => {
    const threadRoot: Post = {
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
    };

    postsFixture.posts = [threadRoot];
    settingsStore.setState({
      pluginSettings: { ...createTestSettings(), allowEditingPastNotes: true },
      threadFocusRootId: "root-past-1",
      displayMode: DISPLAY_MODE.FOCUS,
      date: yesterday.clone(),
    });
    mockInsertTextAfter.mockResolvedValue("");
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
    const todayThreadRoot: Post = {
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
    };

    postsFixture.posts = [todayThreadRoot];
    settingsStore.setState({
      threadFocusRootId: "root-today-1",
      displayMode: DISPLAY_MODE.FOCUS,
      date: today.clone(),
    });
    mockInsertTextAfter.mockResolvedValue("");
    mockRefreshPosts.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockInsertTextAfter.mock.calls[0][1]).toContain(
      `- ${today.format("HH:mm:ss")} timeline post`,
    );
    expect(mockInsertTextAfter.mock.calls[0][1]).not.toContain("- 23:59:59 timeline post");
  });

  it("handleHighlightPost は同じ Daystream タブを focused/day/all へ切り替えて対象投稿をハイライトする", async () => {
    const targetPost: Post = {
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
    };

    settingsStore.setState({
      activeTag: "IT",
      granularity: "month",
      dateFilter: "7d",
      timeFilter: "latest",
      displayMode: DISPLAY_MODE.TIMELINE,
      asTask: true,
      threadOnly: true,
      searchQuery: "abc",
    });

    editorStore.setState({
      editingPost: {
        ...targetPost,
        id: "editing-post",
        message: "editing",
      },
    });

    mockAppContext({
      loadFile: loadFileReturning(["## Thino", "- 14:39:00 jump target", ""].join("\n")),
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
    const plainPost: Post = {
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
    };

    const mockReplaceRange = vi.fn<ObsidianAppShell["replaceRange"]>().mockResolvedValue("");
    const content = ["## Thino", "- 12:00:00 parent", ""].join("\n");
    mockAppContext({
      replaceRange: mockReplaceRange,
      loadFile: loadFileReturning(content),
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
    expect(mockReplaceRange.mock.calls[0][3]).not.toContain("- 23:59:59 parent");
    // 置換されたテキストに実際の dstrId が含まれていることを確認
    expect(mockReplaceRange.mock.calls[0][3]).toContain(`[${THREAD_METADATA_KEYS.ID}::${fid}]`);
  });

  it("スレッド作成は dstrId がなくても最新オフセットを再発見して置換する", async () => {
    const plainPost: Post = {
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
    };

    const shiftedContent = `## Thino
note header
- 12:00:00 parent
`;

    const mockReplaceRange = vi.fn<ObsidianAppShell["replaceRange"]>().mockResolvedValue("");
    mockAppContext({
      replaceRange: mockReplaceRange,
      loadFile: loadFileReturning(shiftedContent),
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.createThread(plainPost);
    });

    expect(mockReplaceRange).toHaveBeenCalledOnce();
    expect(mockReplaceRange.mock.calls[0][1]).toBe(shiftedContent.indexOf("- 12:00:00 parent"));
    expect(mockReplaceRange.mock.calls[0][2]).toBeGreaterThan(mockReplaceRange.mock.calls[0][1]);
  });

  it("タイムラインからスレッド作成した時はフォーカス切替後に再読込する", async () => {
    const plainPost: Post = {
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
    };

    const mockReplaceRange = vi.fn<ObsidianAppShell["replaceRange"]>().mockResolvedValue("");
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

    mockAppContext({
      replaceRange: mockReplaceRange,
      loadFile: loadFileReturning(content),
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
    expect(refreshStateSnapshots).toHaveLength(1);
    const [snapshot] = refreshStateSnapshots;
    expect(snapshot?.threadFocusRootId).toMatch(/^[a-f0-9]{8}$/);
    expect(snapshot).toEqual({
      displayMode: DISPLAY_MODE.FOCUS,
      threadFocusRootId: snapshot?.threadFocusRootId,
      dateIso: yesterday.clone().startOf("day").toISOString(),
    });
  });

  it("既存スレッドを表示するとフォーカス表示へ切り替わる", async () => {
    const threadRoot: Post = {
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
    };

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
    const rootPost: Post = {
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
    };
    const replyPost: Post = {
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
    };

    postsFixture.posts = [replyPost, rootPost];
    settingsStore.setState({ threadFocusRootId: "root-1" });

    const mockReplaceRange = vi.fn<ObsidianAppShell["replaceRange"]>().mockResolvedValue("");
    const content = [
      "## Thino",
      `- 12:00:00 parent [${THREAD_METADATA_KEYS.ID}::root-1]`,
      "- 23:59:59 reply",
      `    [${THREAD_METADATA_KEYS.PARENT_ID}::root-1]`,
      `    [posted::${today.toISOString()}]`,
      "",
    ].join("\n");
    mockAppContext({
      replaceRange: mockReplaceRange,
      loadFile: loadFileReturning(content),
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.deletePost(rootPost);
    });

    expect(mockReplaceRange).toHaveBeenCalledTimes(2);
    expect(mockRefreshPosts).toHaveBeenCalledWith(yesterdayNote.path);
    expect(settingsStore.getState().threadFocusRootId).toBeNull();
  });

  it("dstrId がある投稿はオフセットがずれても最新位置で削除できる", async () => {
    const rootPost: Post = {
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
    };

    const replyPost: Post = {
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
    };

    const shiftedContent = `## Thino
prefix
- 12:00:00 parent
    [${THREAD_METADATA_KEYS.ID}::root-1]
    [${THREAD_METADATA_KEYS.PARENT_ID}::root-1]
- 23:59:59 reply
    [${THREAD_METADATA_KEYS.PARENT_ID}::root-1]
    [posted::${today.toISOString()}]
`;

    postsFixture.posts = [replyPost, rootPost];
    settingsStore.setState({ threadFocusRootId: "root-1" });

    const mockReplaceRange = vi.fn<ObsidianAppShell["replaceRange"]>().mockResolvedValue("");
    mockAppContext({
      replaceRange: mockReplaceRange,
      loadFile: loadFileReturning(shiftedContent),
    });

    const { result } = renderHook(() => usePostActions());

    await act(async () => {
      await result.current.deletePost(rootPost);
    });

    expect(mockReplaceRange).toHaveBeenCalledTimes(2);
    expect(mockReplaceRange.mock.calls[0][1]).toBeGreaterThan(rootPost.startOffset);
    expect(mockReplaceRange.mock.calls[1][1]).toBeGreaterThan(rootPost.startOffset);
    expect(settingsStore.getState().threadFocusRootId).toBeNull();
  });

  it("永久削除は対象投稿だけを消して前後のデータを壊さない", async () => {
    const targetPost: Post = {
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
    };

    let storedContent = `## Thino
- 09:00:00 keep before
- 10:00:00 remove me
- 11:00:00 keep after
`;

    const mockLoadFile = vi.fn<ObsidianAppShell["loadFile"]>(async () => storedContent);
    const mockReplaceRange = vi.fn<ObsidianAppShell["replaceRange"]>(
      async (_path, startOffset, endOffset, replacement) => {
        storedContent =
          storedContent.slice(0, startOffset) + replacement + storedContent.slice(endOffset);
        return storedContent;
      },
    );
    const mockWrite = vi.fn<WriteFile>(async (_path, content) => {
      storedContent = content;
    });

    mockApp.vault.adapter.write = mockWrite;

    mockAppContext({
      replaceRange: mockReplaceRange,
      loadFile: mockLoadFile,
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
    const rootPost: Post = {
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
    };

    let storedContent = `## Thino
- 09:00:00 keep before
- 10:00:00 thread root
    [${THREAD_METADATA_KEYS.ID}::root-1]
- 10:30:00 thread reply
    [${THREAD_METADATA_KEYS.PARENT_ID}::root-1]
    [posted::${today.toISOString()}]
- 11:00:00 keep after
`;

    const mockLoadFile = vi.fn<ObsidianAppShell["loadFile"]>(async () => storedContent);
    const mockReplaceRange = vi.fn<ObsidianAppShell["replaceRange"]>(
      async (_path, startOffset, endOffset, replacement) => {
        storedContent =
          storedContent.slice(0, startOffset) + replacement + storedContent.slice(endOffset);
        return storedContent;
      },
    );
    const mockWrite = vi.fn<WriteFile>(async (_path, content) => {
      storedContent = content;
    });

    mockApp.vault.adapter.write = mockWrite;

    settingsStore.setState({ threadFocusRootId: "root-1" });

    mockAppContext({
      replaceRange: mockReplaceRange,
      loadFile: mockLoadFile,
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
