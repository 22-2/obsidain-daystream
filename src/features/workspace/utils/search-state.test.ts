import { MAIN_VIEW } from "src/features/workspace/config/constants";
import { getEffectiveSearchState } from "src/features/workspace/utils/search-state";
import { describe, expect, it } from "vitest";

describe("getEffectiveSearchState", () => {
  it("検索タブだけで検索条件を適用する", () => {
    expect(
      getEffectiveSearchState({
        mainView: MAIN_VIEW.SEARCH,
        searchQuery: "wanted",
        threadOnly: true,
      }),
    ).toEqual({ searchQuery: "wanted", threadOnly: true });

    expect(
      getEffectiveSearchState({
        mainView: MAIN_VIEW.TIMELINE,
        searchQuery: "wanted",
        threadOnly: true,
      }),
    ).toEqual({ searchQuery: "", threadOnly: false });
  });

  it("mainView 導入前の呼び出しでは従来の検索条件を維持する", () => {
    expect(getEffectiveSearchState({ searchQuery: "legacy", threadOnly: true })).toEqual({
      searchQuery: "legacy",
      threadOnly: true,
    });
  });

  it("独自レイアウトの検索入力が開いている間は検索条件を適用する", () => {
    expect(
      getEffectiveSearchState({
        mainView: MAIN_VIEW.TIMELINE,
        searchInputOpen: true,
        searchQuery: "journal",
        threadOnly: false,
      }),
    ).toEqual({ searchQuery: "journal", threadOnly: false });
  });
});
