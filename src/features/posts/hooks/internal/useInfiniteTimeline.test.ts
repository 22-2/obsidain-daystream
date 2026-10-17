// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { Moment } from "moment";
import { obsidianMoment } from "src/core/platform/obsidian-globals";
import type { MemoRecord } from "src/core/db/dstr-db";
import type { TimelinePostsPage } from "src/features/posts/hooks/internal/timelinePosts";
import { useInfiniteTimeline } from "src/features/posts/hooks/internal/useInfiniteTimeline";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type InfiniteKeyLoader = (
  pageIndex: number,
  previousPageData: TimelinePostsPage | null,
) => unknown;
type InfiniteFetcher = (key: unknown[]) => Promise<TimelinePostsPage>;
type InfiniteMockResponse = {
  data: TimelinePostsPage[] | undefined;
  size: number;
  setSize: () => Promise<TimelinePostsPage[] | undefined>;
  isValidating: boolean;
  isLoading: boolean;
};
type InfiniteMockArgs = [
  getKey: InfiniteKeyLoader,
  fetcher: InfiniteFetcher,
  options?: { revalidateAll?: boolean },
];
type MockDatabase = {
  getMemos: (...args: unknown[]) => Promise<MemoRecord[]>;
  getPinnedMemos?: (...args: unknown[]) => Promise<MemoRecord[]>;
};
type SwrMockArgs = [key: unknown, fetcher: (key: unknown[]) => Promise<unknown>];
type SwrMockResponse = {
  data: unknown;
  mutate: (...args: unknown[]) => Promise<unknown>;
  isValidating: boolean;
  isLoading: boolean;
  error: unknown;
};

const useSWRInfiniteMock = vi.fn((..._args: InfiniteMockArgs): InfiniteMockResponse => ({
  data: undefined,
  size: 1,
  setSize: async () => undefined,
  isValidating: false,
  isLoading: false,
}));
const mutateMock = vi.fn<(...args: unknown[]) => unknown>();
const addPathsMock = vi.fn<(paths: Set<string>) => void>();
const setPostsMock = vi.fn<(...args: unknown[]) => void>();
const setDateMock = vi.fn<(date: Moment) => void>();
const loadFileMock = vi.fn(async (_path: string) => "");
const cachedReadFileMock = vi.fn(async () => "");
const workerGetMock = vi.fn<() => MockDatabase>();
const useSWRMock = vi.fn((..._args: SwrMockArgs): SwrMockResponse => ({
  data: undefined,
  mutate: async () => undefined,
  isValidating: false,
  isLoading: false,
  error: undefined,
}));

const settingsState = {
  activeTopic: "topic-a",
  displayMode: "timeline",
  date: obsidianMoment("2026-03-15T00:00:00.000Z"),
  searchQuery: "",
  threadOnly: false,
  setDate: setDateMock,
  getEffectiveDate: () => settingsState.date.clone(),
};

vi.mock("swr", () => ({
  default: (...args: Parameters<typeof useSWRMock>) => useSWRMock(...args),
  mutate: (...args: unknown[]) => mutateMock(...args),
}));

vi.mock("swr/infinite", () => {
  return {
    default: (...args: InfiniteMockArgs) => useSWRInfiniteMock(...args),
    unstable_serialize: (getKey: (pageIndex: number, previousPageData: null) => unknown) =>
      `$inf$${JSON.stringify(getKey(0, null))}`,
  };
});

vi.mock("src/core/ui/context/AppContext", () => ({
  useAppContext: () => ({
    shell: {
      loadFile: loadFileMock,
      cachedReadFile: cachedReadFileMock,
    },
  }),
  useObsidianApp: () => ({}),
}));

vi.mock("src/features/workspace/store/settingsStore", () => ({
  settingsStore: {
    getState: () => settingsState,
  },
  useSettingsStore: (selector: (state: typeof settingsState) => unknown) => selector(settingsState),
}));

vi.mock("src/features/workspace/store/appStore", () => ({
  useRequiredAppStore: () => ({
    getState: () => settingsState,
  }),
}));

vi.mock("src/features/tasks/store/tasksStore", () => ({
  useTasksStore: (selector: (state: { setPosts: typeof setPostsMock }) => unknown) =>
    selector({ setPosts: setPostsMock }),
}));

vi.mock("src/features/notes/store/noteStore", () => ({
  useNoteStore: (selector: (state: { addPaths: typeof addPathsMock }) => unknown) =>
    selector({ addPaths: addPathsMock }),
}));

vi.mock("src/features/workspace/utils/view-mode", () => ({
  isTimelineView: (mode: string) => mode === "timeline",
}));

vi.mock("./timelinePosts", () => ({
  resolveTimelineCacheBucket: vi.fn(() => 123),
  resolveTimelineBaseDate: vi.fn(
    (pageParam: string | null, getEffectiveDate: () => Moment) =>
      pageParam ? obsidianMoment(pageParam) : getEffectiveDate(),
  ),
}));

vi.mock("src/core/db/worker-client", () => ({
  WorkerClient: {
    get: () => workerGetMock(),
  },
}));

describe("useInfiniteTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // モック環境で Obsidian の `activeDocument.hasFocus()` を安定させる
    vi.stubGlobal("activeDocument", { hasFocus: vi.fn(() => true) });

    settingsState.activeTopic = "topic-a";
    settingsState.displayMode = "timeline";
    settingsState.date = obsidianMoment("2026-03-15T00:00:00.000Z");

    workerGetMock.mockReturnValue({
      getMemos: vi.fn(async () => []),
      getPinnedMemos: vi.fn(async () => []),
    });

    useSWRMock.mockReturnValue({
      data: undefined,
      mutate: vi.fn(async () => undefined),
      isValidating: false,
      isLoading: false,
      error: undefined,
    });

    useSWRInfiniteMock.mockReturnValue({
      data: undefined,
      size: 1,
      setSize: vi.fn(async () => undefined),
      isValidating: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queryKey に日付キーを含め、日付跨ぎでクエリが切り替わる", () => {
    const { rerender } = renderHook(() => useInfiniteTimeline());

    const getKey = useSWRInfiniteMock.mock.calls[0][0];
    const key = getKey(0, null);
    expect(key).toEqual(["posts", "topic-a", "timeline", "2026-03-15", "", false, null]);

    settingsState.date = obsidianMoment("2026-03-16T00:00:00.000Z");
    rerender();

    const secondGetKey = useSWRInfiniteMock.mock.calls[1][0];
    const secondKey = secondGetKey(0, null);
    expect(secondKey).toEqual(["posts", "topic-a", "timeline", "2026-03-16", "", false, null]);
  });

  it("スクロール後に更新した投稿も即時反映できるよう全ページ再検証を有効化する", () => {
    renderHook(() => useInfiniteTimeline());

    expect(useSWRInfiniteMock.mock.calls[0][2]).toMatchObject({
      revalidateAll: true,
    });
  });

  it("queryFn で getMemos が呼ばれる", async () => {
    const getMemosMock = vi.fn(async () => []);
    workerGetMock.mockReturnValue({ getMemos: getMemosMock });

    renderHook(() => useInfiniteTimeline());

    const fetcher = useSWRInfiniteMock.mock.calls[0][1];
    await fetcher(["posts", "topic-a", "timeline", "2026-03-15", "", false, null]);

    expect(getMemosMock).toHaveBeenCalled();
  });

  it("pinned 投稿は DB から別取得される", async () => {
    const getPinnedMemosMock = vi.fn().mockResolvedValue([]);
    workerGetMock.mockReturnValue({
      getMemos: vi.fn(async () => []),
      getPinnedMemos: getPinnedMemosMock,
    });

    renderHook(() => useInfiniteTimeline());

    const fetcher = useSWRMock.mock.calls[0][1];
    await fetcher(["posts", "timeline-pinned", "topic-a", "", false]);

    expect(getPinnedMemosMock).toHaveBeenCalledWith({
      topicId: "topic-a",
      query: "",
      threadOnly: false,
      noteGranularity: "day",
    });
  });

  it("タイムライン表示中に日付が変わったら setDate を呼ぶ", () => {
    settingsState.date = obsidianMoment("2026-03-15T00:00:00.000Z");
    vi.setSystemTime(new Date("2026-03-16T00:01:00.000Z"));

    renderHook(() => useInfiniteTimeline());

    act(() => {
      vi.advanceTimersByTime(30 * 1000);
    });

    expect(setDateMock).toHaveBeenCalledTimes(1);
    const calledMoment = setDateMock.mock.calls[0][0];
    expect(calledMoment.isSame(obsidianMoment("2026-03-16T00:01:00.000Z"), "day")).toBe(true);
  });
});
