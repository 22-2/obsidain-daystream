// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { SearchControls } from "src/ui/components/search/SearchControls";
import {
  AppStoreProvider,
  createAppStore,
  type AppStoreApi,
} from "src/ui/store/appStore";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let store: AppStoreApi;

beforeEach(() => {
  store = createAppStore();
  store.setState({ searchInputOpen: false, searchQuery: "" });
});

afterEach(cleanup);

describe("SearchControls", () => {
  it("検索入力だけを表示し、追加の絞り込みボタンを置かない", () => {
    render(
      <AppStoreProvider store={store}>
        <SearchControls />
      </AppStoreProvider>,
    );

    expect(screen.getByRole("searchbox", { name: "本文・URL・タグを検索" })).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
