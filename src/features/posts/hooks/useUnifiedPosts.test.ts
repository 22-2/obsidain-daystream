import { DISPLAY_MODE } from "src/features/workspace/config/constants";
import { shouldUseTimelineView } from "src/features/posts/hooks/useUnifiedPosts";
import { describe, expect, it } from "vitest";

describe("shouldUseTimelineView", () => {
  it("periodic + timeline なら timeline取得を使う", () => {
    expect(
      shouldUseTimelineView({
        displayMode: DISPLAY_MODE.TIMELINE,
        viewNoteMode: "periodic",
      }),
    ).toBe(true);
  });

  it("fixed + timeline でも timeline取得を使わない", () => {
    expect(
      shouldUseTimelineView({
        displayMode: DISPLAY_MODE.TIMELINE,
        viewNoteMode: "fixed",
      }),
    ).toBe(false);
  });

  it("periodic + focus は timeline取得を使わない", () => {
    expect(
      shouldUseTimelineView({
        displayMode: DISPLAY_MODE.FOCUS,
        viewNoteMode: "periodic",
      }),
    ).toBe(false);
  });
});
