import { DISPLAY_MODE, MAIN_VIEW } from "src/ui/config/consntants";
import { getCenterIndicatorLabel, isDefaultViewState } from "src/ui/utils/view-state";
import { describe, expect, it } from "vitest";

describe("view-state utilities", () => {
  it("activeTag があるとデフォルト扱いにしない", () => {
    expect(
      isDefaultViewState({
        displayMode: DISPLAY_MODE.TIMELINE,
        granularity: "day",
        dateFilter: "today",
        timeFilter: "all",
        asTask: false,
        activeTag: "IT",
        threadFocusRootId: null,
        searchQuery: "",
        searchInputOpen: false,
      }),
    ).toBe(false);
  });

  it("検索中はデフォルト扱いにしない", () => {
    expect(
      isDefaultViewState({
        displayMode: DISPLAY_MODE.TIMELINE,
        granularity: "day",
        dateFilter: "today",
        timeFilter: "all",
        asTask: false,
        activeTag: null,
        threadFocusRootId: null,
        searchQuery: "wanted",
        searchInputOpen: true,
      }),
    ).toBe(false);
  });

  it("検索入力が開いているだけならデフォルト扱いにする", () => {
    expect(
      isDefaultViewState({
        displayMode: DISPLAY_MODE.TIMELINE,
        granularity: "day",
        dateFilter: "today",
        timeFilter: "all",
        asTask: false,
        activeTag: null,
        threadFocusRootId: null,
        searchQuery: "",
        searchInputOpen: true,
      }),
    ).toBe(true);
  });

  it("日付ビューの既定表示は focus として扱う", () => {
    expect(
      isDefaultViewState({
        mainView: MAIN_VIEW.DATE,
        displayMode: DISPLAY_MODE.FOCUS,
        granularity: "day",
        dateFilter: "today",
        timeFilter: "all",
        asTask: false,
        activeTag: null,
        threadFocusRootId: null,
        searchQuery: "",
        searchInputOpen: false,
      }),
    ).toBe(true);
  });

  it("日付ビューでは検索タブに保持した検索語を default 判定へ持ち込まない", () => {
    expect(
      isDefaultViewState({
        mainView: MAIN_VIEW.DATE,
        displayMode: DISPLAY_MODE.FOCUS,
        granularity: "day",
        dateFilter: "today",
        timeFilter: "all",
        asTask: false,
        activeTag: null,
        threadFocusRootId: null,
        searchQuery: "wanted",
        searchInputOpen: false,
      }),
    ).toBe(true);
  });

  it("タグ表示中は center ラベルを優先する", () => {
    expect(
      getCenterIndicatorLabel({
        displayMode: DISPLAY_MODE.FOCUS,
        threadFocusRootId: "root-1",
        activeTag: "IT",
      }),
    ).toBe("タグ表示中");
  });
});
