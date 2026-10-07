import { CONTENT_VIEW, DISPLAY_MODE, MAIN_VIEW } from "src/features/workspace/config/constants";
import { resolveMainViewCompatibilityState } from "src/features/workspace/utils/main-view-state";
import { describe, expect, it } from "vitest";

describe("resolveMainViewCompatibilityState", () => {
  it.each([
    [
      MAIN_VIEW.DATE,
      { contentView: CONTENT_VIEW.TIMELINE, displayMode: DISPLAY_MODE.FOCUS, asTask: false },
    ],
    [
      MAIN_VIEW.TIMELINE,
      { contentView: CONTENT_VIEW.TIMELINE, displayMode: DISPLAY_MODE.TIMELINE, asTask: false },
    ],
    [
      MAIN_VIEW.SEARCH,
      { contentView: CONTENT_VIEW.TIMELINE, displayMode: DISPLAY_MODE.TIMELINE, asTask: false },
    ],
    [
      MAIN_VIEW.TASKS,
      { contentView: CONTENT_VIEW.TIMELINE, displayMode: DISPLAY_MODE.TIMELINE, asTask: true },
    ],
  ])("%s を旧表示条件へ一意に変換する", (mainView, expected) => {
    expect(resolveMainViewCompatibilityState(mainView)).toEqual(expected);
  });

  it("インサイトでは直前の表示方式を保持する", () => {
    expect(resolveMainViewCompatibilityState(MAIN_VIEW.INSIGHTS, DISPLAY_MODE.FOCUS)).toEqual({
      contentView: CONTENT_VIEW.INSIGHTS,
      displayMode: DISPLAY_MODE.FOCUS,
      asTask: false,
    });
  });
});
