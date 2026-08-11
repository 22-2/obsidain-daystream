import { DISPLAY_MODE } from "src/ui/config/consntants";
import { isPlainFocusView, isThreadView, isTimelineView } from "src/ui/utils/view-mode";
import { describe, expect, test } from "vitest";

describe("view-mode", () => {
  test("detects timeline view from display mode", () => {
    expect(isTimelineView(DISPLAY_MODE.TIMELINE)).toBe(true);
    expect(isTimelineView(DISPLAY_MODE.FOCUS)).toBe(false);
  });

  test("detects thread view from focus mode and root id", () => {
    expect(
      isThreadView({
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: "root-1",
      }),
    ).toBe(true);

    expect(
      isThreadView({
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: null,
      }),
    ).toBe(false);

    expect(
      isThreadView({
        displayMode: DISPLAY_MODE.TIMELINE,
        threadFocusRootId: "root-1",
      }),
    ).toBe(false);
  });

  test("detects plain focus view when no thread is selected", () => {
    expect(
      isPlainFocusView({
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: null,
      }),
    ).toBe(true);

    expect(
      isPlainFocusView({
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: "root-1",
      }),
    ).toBe(false);
  });
});
