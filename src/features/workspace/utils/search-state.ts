import { MAIN_VIEW } from "src/features/workspace/config/constants";
import type { MainView } from "src/features/workspace/types";

export function getEffectiveSearchState(state: {
  mainView?: MainView;
  searchInputOpen?: boolean;
  searchQuery: string;
  threadOnly: boolean;
}): { searchQuery: string; threadOnly: boolean } {
  // 意図: mainView 導入前の保存状態・テスト用ストアは従来どおり検索を適用し、
  // 新しい画面では検索タブだけに条件を閉じ込める。
  const isSearchView =
    state.mainView == null || state.mainView === MAIN_VIEW.SEARCH || state.searchInputOpen === true;
  return {
    searchQuery: isSearchView ? state.searchQuery : "",
    threadOnly: isSearchView ? state.threadOnly : false,
  };
}
