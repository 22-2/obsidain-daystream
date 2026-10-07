// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SearchControls } from "src/features/posts/components/search/SearchControls";
import { AppStoreProvider, createAppStore, type AppStoreApi } from "src/features/workspace/store/appStore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
        <SearchControls onClose={vi.fn()} />
      </AppStoreProvider>,
    );

    expect(screen.getByPlaceholderText("本文・URL・タグを検索")).toBeTruthy();
    expect(screen.getByRole("button", { name: "検索を閉じる" })).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("開いた検索欄にフォーカスし、入力値を保持して Esc とボタンで閉じる", async () => {
    const onClose = vi.fn();
    store.setState({ searchInputOpen: true, searchQuery: "saved" });
    render(
      <AppStoreProvider store={store}>
        <SearchControls onClose={onClose} />
      </AppStoreProvider>,
    );
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    await act(() => vi.runOnlyPendingTimersAsync());
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("saved");
    fireEvent.change(input, { target: { value: "updated" } });
    expect(store.getState().searchQuery).toBe("updated");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "検索を閉じる" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    act(() => store.getState().setSearchInputOpen(true));
    await act(() => vi.runOnlyPendingTimersAsync());
    expect(document.activeElement).toBe(input);
  });
});
