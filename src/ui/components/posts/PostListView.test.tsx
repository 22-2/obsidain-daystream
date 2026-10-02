// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import moment from "moment";
import React from "react";
import { PostListView } from "src/ui/components/posts/PostListView";
import type { TimelineItem } from "src/ui/hooks/internal/useTimelineItems";
import type { UsePostsOutput } from "src/ui/hooks/usePosts";
import type { Post } from "src/ui/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  return {
    posts: [] as Post[],
    settings: {
      activeTag: null,
      granularity: "day" as const,
      displayMode: "focus" as const,
      dateFilter: "today" as const,
      sidebarOpen: false,
      setDate: vi.fn(),
      setDisplayMode: vi.fn(),
      setThreadFocusRootId: vi.fn(),
      asTask: false,
      searchQuery: "",
      isReadOnly: vi.fn(() => false),
      timeFilter: "all" as const,
      threadFocusRootId: null,
      viewNoteMode: "periodic" as const,
    },
    editor: {
      editingPostOffset: 10,
      editingPost: null as Post | null,
      highlightedPost: null,
      highlightRequestId: 0,
      startEdit: vi.fn(),
      setEditingPost: vi.fn(),
    },
    virtualizerHandle: {
      scrollToIndex: vi.fn(),
    },
    postList: {
      hasMore: false,
      isLoading: false,
      timelineView: false,
    },
  };
});

function createUsePostsValue(posts: Post[]): UsePostsOutput {
  const timelineItems: TimelineItem[] = posts.map((post) => ({
    type: "post",
    post,
    key: `post-${post.id}`,
  }));

  return {
    posts,
    filteredPosts: posts,
    filteredPostsWithThreadReplies: posts,
    timelineItems,
    visibleDividerGroupKeys: [],
    collapsedGroupSet: new Set<string>(),
    canCollapseDividers: false,
    toggleCollapsedGroup: vi.fn(),
    collapseGroups: vi.fn(),
    expandGroups: vi.fn(),
    loadMore: vi.fn(),
    hasMore: mocked.postList.hasMore,
    isLoading: mocked.postList.isLoading,
    isValidating: false,
    timelineView: mocked.postList.timelineView,
    threadView: false,
  };
}

function createPost(): Post {
  return {
    id: "post-1",
    threadRootId: null,
    timestamp: moment("2026-04-10T14:39:00.000Z"),
    noteDate: moment("2026-04-10T00:00:00.000Z"),
    message: "editing target",
    metadata: {},
    offset: 10,
    startOffset: 10,
    endOffset: 30,
    bodyStartOffset: 12,
    kind: "thino",
    path: "daily/2026-04-10.md",
  };
}

vi.mock("obsidian", () => ({
  Menu: class {
    addItem() {
      return this;
    }
    addSeparator() {
      return this;
    }
    showAtMouseEvent() {}
  },
  Notice: vi.fn(),
}));

vi.mock("src/ui/context/EditorRefsContext", () => ({
  useEditorRefs: () => ({
    inputRef: { current: null },
    scrollContainerRef: { current: null },
    listHeaderRef: { current: null },
  }),
  EditorRefsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("src/ui/context/AppContext", () => ({
  useAppContext: () => ({
    shell: {
      on: vi.fn(),
      off: vi.fn(),
      trigger: vi.fn(),
    },
    storage: {
      get: vi.fn(() => []),
      set: vi.fn(),
    },
    settings: {
      insertAfter: "## Thino",
    },
  }),
}));

vi.mock("src/ui/store/noteStore", () => ({
  useNoteStore: <T,>(selector: (state: { openDailyNoteForDate: () => Promise<void> }) => T): T =>
    selector({
      openDailyNoteForDate: vi.fn().mockResolvedValue(undefined),
    }),
}));

vi.mock("src/ui/hooks/useObsidianUi", () => ({
  useObsidianUi: () => ({
    showTextInput: vi.fn(),
    confirmDeleteAction: vi.fn(),
    openBacklinkPreview: vi.fn(),
  }),
}));

vi.mock("src/ui/hooks/usePosts", () => ({
  usePosts: () => createUsePostsValue(mocked.posts),
}));

vi.mock("src/ui/hooks/usePostBacklinkCounts", () => ({
  usePostBacklinks: () => ({
    countMap: new Map<string, number>(),
    postsMap: new Map<string, Post[]>(),
  }),
}));

vi.mock("src/ui/hooks/internal/usePostMutations", () => ({
  usePostMutations: () => ({
    handleHighlightPost: vi.fn(),
    deletePost: vi.fn(),
    permanentlyDeletePost: vi.fn(),
    movePostToTomorrow: vi.fn(),
    archivePost: vi.fn(),
    createThread: vi.fn(),
    setPostTags: vi.fn(),
    setPostPinned: vi.fn(),
    copyBlockIdLink: vi.fn(),
  }),
}));

vi.mock("src/ui/store/settingsStore", () => ({
  useSettingsStore: <T,>(selector: (state: typeof mocked.settings) => T): T =>
    selector(mocked.settings),
}));

vi.mock("src/ui/store/editorStore", () => ({
  useEditorStore: <T,>(selector: (state: typeof mocked.editor) => T): T => selector(mocked.editor),
}));

vi.mock("src/ui/components/posts/PostCardView", () => ({
  PostCardView: ({
    post,
    isHighlighted,
    showGranularityBadge,
  }: {
    post: Post;
    isHighlighted?: boolean;
    showGranularityBadge?: boolean;
  }) =>
    React.createElement(
      "div",
      {
        "data-testid": post.id,
        "data-highlighted": isHighlighted ? "true" : "false",
        "data-granularity-badge": showGranularityBadge ? "true" : "false",
      },
      post.message,
    ),
}));

vi.mock("src/ui/components/posts/DateDivider", () => ({
  DateDivider: () => React.createElement("div", null),
}));

vi.mock("src/ui/components/primitives/FloatingButton", () => ({
  FloatingButton: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

vi.mock("src/ui/components/common/ObsidianIcon", () => ({
  ObsidianIcon: () => React.createElement("div", null),
}));

vi.mock("virtua", () => {
  const Virtualizer = React.forwardRef(
    (
      { children }: { children: React.ReactNode },
      ref: React.ForwardedRef<{
        scrollToIndex: typeof mocked.virtualizerHandle.scrollToIndex;
      }>,
    ) => {
      if (typeof ref === "function") {
        ref(mocked.virtualizerHandle);
      } else if (ref && "current" in ref) {
        ref.current = mocked.virtualizerHandle;
      }
      return React.createElement("div", null, children);
    },
  );
  Virtualizer.displayName = "Virtualizer";
  return { Virtualizer };
});

describe("PostListView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const post = createPost();
    mocked.posts = [post];
    mocked.editor.highlightedPost = null;
    mocked.editor.highlightRequestId = 0;
    mocked.editor.editingPost = post;
    mocked.editor.editingPostOffset = post.startOffset;
    mocked.postList.hasMore = false;
    mocked.postList.isLoading = false;
    mocked.postList.timelineView = false;
    mocked.virtualizerHandle.scrollToIndex.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("編集中のポストも非表示にせずハイライトして表示する", () => {
    render(<PostListView />);

    expect(screen.getByTestId("post-1")).toBeDefined();
    expect(screen.getByTestId("post-1").getAttribute("data-highlighted")).toBe("true");
    expect(screen.getByTestId("post-1").getAttribute("data-granularity-badge")).toBe("false");
  });

  it("日次と月次の投稿が同時に表示される時だけ粒度バッジを出す", () => {
    mocked.posts = [
      { ...createPost(), id: "month-post", noteGranularity: "month" },
      { ...createPost(), id: "day-post", noteGranularity: "day" },
    ];

    render(<PostListView />);

    expect(screen.getByTestId("month-post").getAttribute("data-granularity-badge")).toBe("true");
    expect(screen.getByTestId("day-post").getAttribute("data-granularity-badge")).toBe("true");
  });

  it("highlightedPost があると対象位置へスクロールする", () => {
    // @ts-expect-error
    mocked.editor.highlightedPost = mocked.posts[0];
    mocked.editor.highlightRequestId = 1;

    render(<PostListView />);

    act(() => {
      vi.runAllTimers();
    });

    expect(mocked.virtualizerHandle.scrollToIndex).toHaveBeenCalledWith(0, {
      align: "center",
    });
  });

  it("タイムラインの初回読み込み中は終端メッセージを表示しない", () => {
    mocked.posts = [];
    mocked.postList.isLoading = true;
    mocked.postList.timelineView = true;

    render(<PostListView />);

    expect(screen.getByText("読み込み中...")).toBeDefined();
    expect(screen.queryByText("これ以上投稿はありません")).toBeNull();
  });
});
