import { WorkspaceLeaf } from "obsidian";
import type { Settings } from "src/core/domain/settings";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";
import { VIEW_TYPE_DSTR } from "src/core/view-types";
import {
  DSTRView,
  LegacyDSTRView,
} from "src/features/workspace/views/DSTRView";
import type { DSTRViewState } from "src/features/workspace/views/state";
import { describe, expect, it, vi } from "vitest";

const fixedState: DSTRViewState = {
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
  file: "dstr/Inbox.dstr.md",
};

describe("DSTRView external state revision", () => {
  it("changes only for state applied by Obsidian, not React partial updates", async () => {
    const view = new DSTRView(new WorkspaceLeaf(), {} as Settings);
    Object.defineProperty(view, "updateView", { value: vi.fn() });

    expect(view.getExternalStateRevision()).toBe(0);

    view.setStatePartial({ fixedSessionNumber: 2 });
    view.setStatePartial({ fixedSessionNumber: 1 });
    expect(view.getExternalStateRevision()).toBe(0);

    await view.setState(fixedState);
    expect(view.getExternalStateRevision()).toBe(1);
  });
});

describe("DSTRView type", () => {
  it("uses the registered DSTR type", () => {
    const view = new DSTRView(new WorkspaceLeaf(), {} as Settings);

    expect(view.getViewType()).toBe(VIEW_TYPE_DSTR);
  });

  it("keeps the legacy type only for workspace migration", () => {
    const view = new LegacyDSTRView(new WorkspaceLeaf(), {} as Settings);

    expect(view.getViewType()).toBe(LEGACY_DAYSTREAM_IDENTIFIERS.viewType);
  });
});

describe("DSTRView React readiness", () => {
  it("waits until React reports that the view is ready", async () => {
    const view = new DSTRView(new WorkspaceLeaf(), {} as Settings);
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
