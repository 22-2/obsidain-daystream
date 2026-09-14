// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import moment from "moment";
import { useInfiniteTimeline } from "src/ui/hooks/internal/useInfiniteTimeline";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useSWRInfiniteMock = vi.fn();
const mutateMock = vi.fn();
const createTimelinePageFetcherMock = vi.fn();
const fetchPageMock = vi.fn();
const addPathsMock = vi.fn();
const setPostsMock = vi.fn();
const setDateMock = vi.fn();
const loadFileMock = vi.fn(async (_path: string) => "");
const cachedReadFileMock = vi.fn(async () => "");
const workerGetMock = vi.fn();
const useSWRMock = vi.fn();

const settingsState = {
  activeTopic: "topic-a",
  displayMode: "timeline",
  date: moment("2026-03-15T00:00:00.000Z"),
  searchQuery: "",
  threadOnly: false,
  setDate: setDateMock,
  getEffectiveDate: () => settingsState.date.clone(),
};

vi.mock("swr", () => ({
  default: (...args: unknown[]) => useSWRMock(...args),
  mutate: (...args: unknown[]) => mutateMock(...args),
}));

vi.mock("swr/infinite", () => {
  return {
    default: (...args: unknown[]) => useSWRInfiniteMock(...args),
    unstable_serialize: (getKey: (pageIndex: number, previousPageData: null) => unknown) =>
      `$inf$${JSON.stringify(getKey(0, null))}`,
  };
});

vi.mock("src/ui/context/AppContext", () => ({
  useAppContext: () => ({
    shell: {
      loadFile: loadFileMock,
      cachedReadFile: cachedReadFileMock,
    },
  }),
  useObsidianApp: () => ({}),
}));

vi.mock("src/ui/store/settingsStore", () => ({
  settingsStore: {
    getState: () => settingsState,
  },
  useSettingsStore: (selector: (state: typeof settingsState) => unknown) => selector(settingsState),
}));

vi.mock("src/ui/store/appStore", () => ({
  useRequiredAppStore: () => ({
    getState: () => settingsState,
  }),
}));

vi.mock("src/ui/store/postsStore", () => ({
  usePostsStore: (selector: (state: { setPosts: typeof setPostsMock }) => unknown) =>
    selector({ setPosts: setPostsMock }),
}));

vi.mock("src/ui/store/noteStore", () => ({
  useNoteStore: (selector: (state: { addPaths: typeof addPathsMock }) => unknown) =>
    selector({ addPaths: addPathsMock }),
}));

vi.mock("src/ui/utils/view-mode", () => ({
  isTimelineView: (mode: string) => mode === "timeline",
}));

vi.mock("./timelinePosts", () => ({
  TIMELINE_CACHE_INVALIDATE_MS: 3 * 60 * 1000,
  resolveTimelineCacheBucket: vi.fn(() => 123),
  resolveTimelineBaseDate: vi.fn(
    (pageParam: string | null, getEffectiveDate: () => moment.Moment) =>
      pageParam ? moment(pageParam) : getEffectiveDate(),
  ),
  createTimelinePageFetcher: (...args: unknown[]) => createTimelinePageFetcherMock(...args),
}));

vi.mock("src/db/worker-client", () => ({
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
    settingsState.date = moment("2026-03-15T00:00:00.000Z");

    fetchPageMock.mockResolvedValue({
      posts: [],
      paths: new Set<string>(),
      hasMore: false,
      lastSearchedDate: moment("2026-03-15T00:00:00.000Z"),
    });
    createTimelinePageFetcherMock.mockReturnValue(fetchPageMock);
    workerGetMock.mockReturnValue({
      getMemos: vi.fn().mockResolvedValue([]),
      getPinnedMemos: vi.fn().mockResolvedValue([]),
    });

    useSWRMock.mockReturnValue({
      data: undefined,
      mutate: vi.fn(),
      isValidating: false,
      isLoading: false,
      error: undefined,
    });

    useSWRInfiniteMock.mockReturnValue({
      data: undefined,
      size: 1,
      setSize: vi.fn(),
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

    settingsState.date = moment("2026-03-16T00:00:00.000Z");
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
    const getMemosMock = vi.fn().mockResolvedValue([]);
    workerGetMock.mockReturnValue({ getMemos: getMemosMock });

    renderHook(() => useInfiniteTimeline());

    const fetcher = useSWRInfiniteMock.mock.calls[0][1];
    await fetcher(["posts", "topic-a", "timeline", "2026-03-15", "", false, null]);

    expect(getMemosMock).toHaveBeenCalled();
  });

  it("pinned 投稿は DB から別取得される", async () => {
    const getPinnedMemosMock = vi.fn().mockResolvedValue([]);
    workerGetMock.mockReturnValue({
      getMemos: vi.fn().mockResolvedValue([]),
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
    settingsState.date = moment("2026-03-15T00:00:00.000Z");
    vi.setSystemTime(new Date("2026-03-16T00:01:00.000Z"));

    renderHook(() => useInfiniteTimeline());

    act(() => {
      vi.advanceTimersByTime(30 * 1000);
    });

    expect(setDateMock).toHaveBeenCalledTimes(1);
    const calledMoment = setDateMock.mock.calls[0][0];
    expect(calledMoment.isSame(moment("2026-03-16T00:01:00.000Z"), "day")).toBe(true);
  });
});
