import { renderHook, waitFor } from "@testing-library/react";
import type moment from "moment";
import React from "react";
import { useFocusPosts } from "src/features/posts/hooks/internal/useFocusPosts";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockSettingsState {
  activeTopic: string;
  date: moment.Moment;
  granularity: "day" | "week" | "month" | "quarter" | "year";
  dateFilter: string;
  searchQuery: string;
  threadOnly: boolean;
  viewNoteMode: "periodic" | "fixed";
  file: string | null;
}

const mocked = vi.hoisted(() => {
  const settings: MockSettingsState = {
    activeTopic: "work",
    date: window.moment("2026-04-06T12:34:56.000Z"),
    granularity: "day",
    dateFilter: "today",
    searchQuery: "",
    threadOnly: false,
    viewNoteMode: "periodic",
    file: null,
  };

  return {
    getMemos: vi.fn(),
    getDb: vi.fn(),
    loadFile: vi.fn(),
    settings,
  };
});

vi.mock("src/core/ui/context/AppContext", () => ({
  useAppContext: () => ({
    // 意図: useFocusPosts が SWR キーに settings.insertAfter を含めるようになったため必須。
    settings: { insertAfter: "## Thino" },
    shell: {
      loadFile: mocked.loadFile,
      getCommunityPlugin: () => undefined,
      getInternalPluginById: () => undefined,
      getAbstractFileByPath: vi.fn(() => null),
      getVault: vi.fn(() => ({
        getAbstractFileByPath: vi.fn(() => null),
        getRoot: vi.fn(() => null),
      })),
    },
  }),
}));

vi.mock("src/core/note-source", () => ({
  resolvePeriodicNote: (shell: unknown, date: any, granularity: string) => {
    if (granularity === "month") {
      return { path: date.format("YYYY-MM") + ".md" };
    }
    if (granularity === "quarter") {
      return { path: date.format("YYYY-[Q]Q") + ".md" };
    }
    if (granularity === "year") {
      return { path: date.format("YYYY") + ".md" };
    }
    return null;
  },
}));

vi.mock("src/core/db/worker-client", () => ({
  WorkerClient: {
    get: () => mocked.getDb(),
  },
}));

vi.mock("src/features/workspace/store/settingsStore", () => ({
  useSettingsStore: <T,>(selector: (state: MockSettingsState) => T): T => selector(mocked.settings),
}));

type MemoRecordLike = {
  id: string;
  path: string;
  content: string;
  createdAt: string;
  metadataJson: string;
  startOffset: number;
  endOffset: number;
  bodyStartOffset: number;
  noteGranularity: "day" | "week" | "month" | "quarter" | "year";
};

function createMemoRecord(overrides: Partial<MemoRecordLike>): MemoRecordLike {
  return {
    id: overrides.id ?? "memo-1",
    path: overrides.path ?? "daily/2026-04-06.md",
    content: overrides.content ?? "message",
    createdAt: overrides.createdAt ?? "2026-04-06T12:00:00.000Z",
    metadataJson: overrides.metadataJson ?? "{}",
    startOffset: overrides.startOffset ?? 10,
    endOffset: overrides.endOffset ?? 20,
    bodyStartOffset: overrides.bodyStartOffset ?? 12,
    noteGranularity: overrides.noteGranularity ?? "day",
  };
}

const swrWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(
    SWRConfig,
    {
      value: {
        provider: () => new Map(),
        dedupingInterval: 0,
        errorRetryCount: 0,
      },
    },
    children,
  );
};

describe("useFocusPosts hook integration", () => {
  beforeEach(() => {
    // SWRの内部タイマー駆動を止めないため、このテスト群だけ実時間タイマーを使う。
    vi.useRealTimers();
    mocked.getMemos.mockReset();
    mocked.getDb.mockReset();
    mocked.loadFile.mockReset();
    mocked.getDb.mockReturnValue({
      getMemos: mocked.getMemos,
    });
    mocked.getMemos.mockResolvedValue([]);
    mocked.settings.activeTopic = "work";
    mocked.settings.date = window.moment("2026-04-06T12:34:56.000Z");
    mocked.settings.granularity = "day";
    mocked.settings.dateFilter = "today";
    mocked.settings.searchQuery = "";
    mocked.settings.threadOnly = false;
    mocked.settings.viewNoteMode = "periodic";
    mocked.settings.file = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fixedモードではtopicIdを渡さず file で投稿を絞る", async () => {
    mocked.settings.viewNoteMode = "fixed";
    mocked.settings.file = "MFDI/Inbox.mfdi.md";
    mocked.settings.searchQuery = "";
    mocked.settings.threadOnly = false;

    mocked.loadFile.mockResolvedValue(
      ["## Thino", "- 12:00:00 from-fixed [mfdiId::root-1]", "- 12:01:00 from-other"].join("/n"),
    );

    const { result } = renderHook(() => useFocusPosts(), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.posts.map((post) => post.message)).toEqual([
        "from-fixed",
        "from-other",
      ]);
    });

    expect(mocked.getMemos).not.toHaveBeenCalled();
    expect(mocked.getDb).not.toHaveBeenCalled();
    expect(mocked.loadFile).toHaveBeenCalledWith("MFDI/Inbox.mfdi.md");
  });

  it("periodicモードではactiveTopicで取得し path絞り込みしない", async () => {
    mocked.settings.viewNoteMode = "periodic";
    mocked.settings.activeTopic = "work";

    mocked.getMemos.mockResolvedValue([
      createMemoRecord({ id: "a", content: "first" }),
      createMemoRecord({ id: "b", content: "second" }),
    ]);

    const { result } = renderHook(() => useFocusPosts(), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.posts.map((post) => post.message)).toEqual(["first", "second"]);
    });

    expect(mocked.getMemos).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: "work",
      }),
    );
    expect(mocked.getDb).toHaveBeenCalledTimes(1);
  });

  it("month granularity は月次ノートと日次ノートの投稿を月内でまとめて表示する", async () => {
    mocked.settings.viewNoteMode = "periodic";
    mocked.settings.granularity = "month";
    mocked.settings.date = window.moment("2026-04-20T09:00:00.000Z");
    mocked.settings.activeTopic = "";

    mocked.loadFile.mockResolvedValue(
      [
        "## Thino",
        "- 09:00:00 from-month-note [mfdiId::month-1]",
        "- 09:01:00 another month entry",
      ].join("/n"),
    );
    mocked.getMemos.mockResolvedValue([
      createMemoRecord({
        id: "daily-post",
        path: "daily/2026-04-19.md",
        content: "from-day-note",
        createdAt: "2026-04-19T09:02:00.000Z",
        noteGranularity: "day",
      }),
    ]);

    const { result } = renderHook(() => useFocusPosts(), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.posts.map((post) => post.message)).toEqual([
        "from-month-note",
        "another month entry",
        "from-day-note",
      ]);
    });

    expect(mocked.loadFile).toHaveBeenCalled();
    expect(mocked.getMemos).toHaveBeenCalledWith(
      expect.objectContaining({ noteGranularity: "day" }),
    );
    expect(result.current.posts[0].noteGranularity).toBe("month");
    expect(result.current.posts[2].noteGranularity).toBe("day");
  });

  it("月次ノート内に別の月の投稿があっても選択月だけを表示する", async () => {
    mocked.settings.viewNoteMode = "periodic";
    mocked.settings.granularity = "month";
    mocked.settings.date = window.moment("2026-04-20T09:00:00.000Z");
    mocked.settings.activeTopic = "";
    mocked.loadFile.mockResolvedValue(
      [
        "## Thino",
        "- 09:00:00 from-march [posted::2026-03-19T09:00:00.000Z]",
        "- 09:01:00 from-april [posted::2026-04-19T09:01:00.000Z]",
      ].join("/n"),
    );
    const { result } = renderHook(() => useFocusPosts(), { wrapper: swrWrapper });

    await waitFor(() => {
      expect(result.current.posts.map((post) => post.message)).toEqual(["from-april"]);
    });
  });

  it("year granularity は年次ノートの path の投稿だけを表示する", async () => {
    mocked.settings.viewNoteMode = "periodic";
    mocked.settings.granularity = "year";
    mocked.settings.date = window.moment("2026-07-20T09:00:00.000Z");
    mocked.settings.activeTopic = "";

    mocked.loadFile.mockResolvedValue(
      [
        "## Thino",
        "- 09:00:00 from-year-note [mfdiId::year-1]",
        "- 09:01:00 another year entry",
      ].join("/n"),
    );

    const { result } = renderHook(() => useFocusPosts(), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.posts.map((post) => post.message)).toEqual([
        "from-year-note",
        "another year entry",
      ]);
    });

    expect(mocked.loadFile).toHaveBeenCalled();
  });

  it("quarter granularity は四半期ノートの path の投稿だけを表示する", async () => {
    mocked.settings.viewNoteMode = "periodic";
    mocked.settings.granularity = "quarter";
    mocked.settings.date = window.moment("2026-05-20T09:00:00.000Z");
    mocked.settings.activeTopic = "";

    mocked.loadFile.mockResolvedValue(
      [
        "## Thino",
        "- 09:00:00 from-quarter-note [mfdiId::quarter-1]",
        "- 09:01:00 another quarter entry",
      ].join("/n"),
    );

    const { result } = renderHook(() => useFocusPosts(), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.posts.map((post) => post.message)).toEqual([
        "from-quarter-note",
        "another quarter entry",
      ]);
    });

    expect(mocked.loadFile).toHaveBeenCalledWith("2026-Q2.md");
  });

  it("fixed + activeTopic空でも file の投稿が表示される", async () => {
    mocked.settings.viewNoteMode = "fixed";
    mocked.settings.activeTopic = "";
    mocked.settings.dateFilter = "all";
    mocked.settings.file = "home/着ぐるみ購入についてあれこれ.mfdi.md";
    mocked.settings.threadOnly = true;
    mocked.settings.searchQuery = "wanted";

    mocked.loadFile.mockResolvedValue(
      [
        "## Thino",
        "- 18:33:04 wanted [posted::2026-03-29T09:33:04.314Z] [mfdiId::root-1]",
        "- 18:34:00 wanted reply [posted::2026-03-29T09:34:00.000Z] [mfdiId::reply-1] [parentId::root-1]",
        "- 18:35:00 other [posted::2026-03-29T09:35:00.000Z]",
      ].join("/n"),
    );

    const { result } = renderHook(() => useFocusPosts(), {
      wrapper: swrWrapper,
    });

    await waitFor(() => {
      expect(result.current.posts.map((post) => post.message)).toEqual(["wanted"]);
    });

    expect(mocked.getMemos).not.toHaveBeenCalled();
    expect(mocked.getDb).not.toHaveBeenCalled();
    expect(mocked.loadFile).toHaveBeenCalledWith("home/着ぐるみ購入についてあれこれ.mfdi.md");
  });
});
