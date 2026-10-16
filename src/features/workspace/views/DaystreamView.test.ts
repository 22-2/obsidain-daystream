import { WorkspaceLeaf } from "obsidian";
import type { Settings } from "src/core/domain/settings";
import { DaystreamView } from "src/features/workspace/views/DaystreamView";
import type { DaystreamViewState } from "src/features/workspace/views/state";
import { describe, expect, it, vi } from "vitest";

const fixedState: DaystreamViewState = {
  displayMode: "focus",
  granularity: "day",
  asTask: false,
  threadOnly: false,
  fixedSessionNumber: 2,
  timeFilter: "all",
  dateFilter: "all",
  searchQuery: "",
  activeTopic: "",
  noteMode: "fixed",
  file: "MFDI/Inbox.mfdi.md",
};

describe("DaystreamView external state revision", () => {
  it("changes only for state applied by Obsidian, not React partial updates", async () => {
    const view = new DaystreamView(new WorkspaceLeaf(), {} as Settings);
    Object.defineProperty(view, "updateView", { value: vi.fn() });

    expect(view.getExternalStateRevision()).toBe(0);

    view.setStatePartial({ fixedSessionNumber: 2 });
    view.setStatePartial({ fixedSessionNumber: 1 });
    expect(view.getExternalStateRevision()).toBe(0);

    await view.setState(fixedState);
    expect(view.getExternalStateRevision()).toBe(1);
  });
});

describe("DaystreamView React readiness", () => {
  it("waits until React reports that the view is ready", async () => {
    const view = new DaystreamView(new WorkspaceLeaf(), {} as Settings);
    let resolved = false;
    const ready = view.waitForReactReady().then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    view.notifyReactReady();
    await ready;
    expect(resolved).toBe(true);
  });
});
