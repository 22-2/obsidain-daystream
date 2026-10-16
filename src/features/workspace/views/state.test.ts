import {
  createDefaultDSTRViewState,
  createFixedNoteViewState,
  getDSTRViewCapabilities,
} from "src/features/workspace/views/state";
import { describe, expect, it } from "vitest";

describe("Daystream view state", () => {
  it("fixed mode では相対期間だけを許可し、それ以外の capability を抑制する", () => {
    expect(getDSTRViewCapabilities({ noteMode: "fixed" })).toEqual({
      supportsDateNavigation: false,
      supportsDisplayModeSwitch: false,
      supportsSidebar: true,
      supportsTopicSelection: false,
      supportsPeriodMenus: true,
      supportsMovePostBetweenDays: false,
      supportsTags: false,
    });
  });

  it("fixed note view state を focus ベースで構築する", () => {
    expect(createFixedNoteViewState("Inbox.md")).toMatchObject({
      noteMode: "fixed",
      file: "Inbox.md",
      displayMode: "focus",
      fixedSessionNumber: 1,
      dateFilter: "all",
      timeFilter: "all",
    });
  });

  it("note mode ごとの既定 dateFilter を一元管理する", () => {
    expect(createDefaultDSTRViewState()).toMatchObject({
      noteMode: "periodic",
      file: null,
      dateFilter: "today",
    });

    expect(
      createDefaultDSTRViewState({
        noteMode: "fixed",
        file: "Inbox.md",
      }),
    ).toMatchObject({
      noteMode: "fixed",
      file: "Inbox.md",
      fixedSessionNumber: 1,
      dateFilter: "all",
    });
  });
});
