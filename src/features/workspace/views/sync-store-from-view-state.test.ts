import type { AppStoreApi } from "src/features/workspace/store/appStore";
import { MAIN_VIEW } from "src/features/workspace/config/constants";
import type { DSTRViewState } from "src/features/workspace/views/state";
import { syncStoreFromDSTRViewState } from "src/features/workspace/views/sync-store-from-view-state";
import { describe, expect, it, vi } from "vitest";

function createMockStore(initialState?: Partial<ReturnType<AppStoreApi["getState"]>>) {
  const state = {
    fixedSessionNumber: 1,
    viewNoteMode: "periodic",
    file: null,
    displayMode: "timeline",
    mainView: MAIN_VIEW.TIMELINE,
    granularity: "week",
    dateFilter: "today",
    timeFilter: "morning",
    asTask: true,
    threadOnly: true,
    activeTag: "tag-a",
    threadFocusRootId: "root-1",
    setViewContext: vi.fn(
      ({
        noteMode,
        file,
        fixedSessionNumber,
      }: {
        noteMode: "periodic" | "fixed";
        file: string | null;
        fixedSessionNumber?: number;
      }) => {
        state.viewNoteMode = noteMode;
        state.file = file;
        state.fixedSessionNumber = fixedSessionNumber ?? 1;
      },
    ),
    ...initialState,
  };

  const store = {
    getState: () => state,
    setState: vi.fn((patch: Partial<typeof state>) => {
      Object.assign(state, patch);
    }),
  } as unknown as AppStoreApi;

  return { state, store };
}

describe("syncStoreFromDSTRViewState", () => {
  it("restores a fixed note session number without reapplying periodic UI state", () => {
    const { state, store } = createMockStore();
    const viewState: DSTRViewState = {
      displayMode: "focus",
      granularity: "day",
      asTask: false,
      threadOnly: false,
      fixedSessionNumber: 4,
      timeFilter: "all",
      dateFilter: "all",
      searchQuery: "",
      activeTopic: "",
      noteMode: "fixed",
      file: "dstr/Inbox.dstr.md",
    };

    syncStoreFromDSTRViewState(store, viewState);

    expect(state.fixedSessionNumber).toBe(4);
    expect(state.viewNoteMode).toBe("fixed");
    expect(state.file).toBe("dstr/Inbox.dstr.md");
    expect(state.displayMode).toBe("focus");
    expect(state.granularity).toBe("day");
    expect(state.dateFilter).toBe("all");
    expect(state.timeFilter).toBe("all");
    expect(state.asTask).toBe(false);
    expect(state.threadOnly).toBe(false);
    expect(state.activeTag).toBeNull();
    expect(state.threadFocusRootId).toBeNull();
    expect(state.setViewContext).toHaveBeenCalledWith({
      noteMode: "fixed",
      file: "dstr/Inbox.dstr.md",
      fixedSessionNumber: 4,
    });
  });

  it("resets fixedSessionNumber to 1 for periodic views", () => {
    const { state, store } = createMockStore({
      fixedSessionNumber: 8,
      viewNoteMode: "fixed",
      file: "dstr/Inbox.dstr.md",
    });
    const viewState: DSTRViewState = {
      displayMode: "timeline",
      granularity: "day",
      asTask: false,
      threadOnly: false,
      fixedSessionNumber: 8,
      timeFilter: "all",
      dateFilter: "today",
      searchQuery: "",
      activeTopic: "",
      noteMode: "periodic",
      file: null,
    };

    syncStoreFromDSTRViewState(store, viewState);

    expect(state.fixedSessionNumber).toBe(1);
    expect(state.viewNoteMode).toBe("periodic");
    expect(state.file).toBeNull();
    expect(state.setViewContext).toHaveBeenCalledWith({
      noteMode: "periodic",
      file: null,
      fixedSessionNumber: 1,
    });
  });

  it("restores a periodic view's main tab without using the vault-wide preference", () => {
    const { state, store } = createMockStore();
    const viewState: DSTRViewState = {
      displayMode: "timeline",
      granularity: "day",
      asTask: false,
      threadOnly: false,
      fixedSessionNumber: 1,
      timeFilter: "all",
      dateFilter: "today",
      searchQuery: "",
      activeTopic: "",
      noteMode: "periodic",
      file: null,
      mainView: MAIN_VIEW.DATE,
    };

    syncStoreFromDSTRViewState(store, viewState);

    expect(state.mainView).toBe(MAIN_VIEW.DATE);
    expect(state.displayMode).toBe("focus");
    expect(state.asTask).toBe(false);
    expect(store.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        mainView: MAIN_VIEW.DATE,
        displayMode: "focus",
      }),
    );
  });
});
