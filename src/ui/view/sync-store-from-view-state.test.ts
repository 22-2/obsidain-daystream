import type { AppStoreApi } from "src/ui/store/appStore";
import type { MFDIViewState } from "src/ui/view/state";
import { syncStoreFromMFDIViewState } from "src/ui/view/sync-store-from-view-state";
import { describe, expect, it, vi } from "vitest";

function createMockStore(initialState?: Partial<ReturnType<AppStoreApi["getState"]>>) {
  const state = {
    fixedSessionNumber: 1,
    viewNoteMode: "periodic",
    file: null,
    displayMode: "timeline",
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

describe("syncStoreFromMFDIViewState", () => {
  it("restores a fixed note session number without reapplying periodic UI state", () => {
    const { state, store } = createMockStore();
    const viewState: MFDIViewState = {
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
      file: "MFDI/Inbox.mfdi.md",
    };

    syncStoreFromMFDIViewState(store, viewState);

    expect(state.fixedSessionNumber).toBe(4);
    expect(state.viewNoteMode).toBe("fixed");
    expect(state.file).toBe("MFDI/Inbox.mfdi.md");
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
      file: "MFDI/Inbox.mfdi.md",
      fixedSessionNumber: 4,
    });
  });

  it("resets fixedSessionNumber to 1 for periodic views", () => {
    const { state, store } = createMockStore({
      fixedSessionNumber: 8,
      viewNoteMode: "fixed",
      file: "MFDI/Inbox.mfdi.md",
    });
    const viewState: MFDIViewState = {
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

    syncStoreFromMFDIViewState(store, viewState);

    expect(state.fixedSessionNumber).toBe(1);
    expect(state.viewNoteMode).toBe("periodic");
    expect(state.file).toBeNull();
    expect(state.setViewContext).toHaveBeenCalledWith({
      noteMode: "periodic",
      file: null,
      fixedSessionNumber: 1,
    });
  });
});
