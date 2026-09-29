import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MAIN_VIEW } from "src/ui/config/consntants";
import { StatusBarHome } from "src/ui/components/statusbar/parts/StatusBarHome";
import { AppStoreProvider, createAppStore } from "src/ui/store/appStore";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("月表示のまま別の月へ移動してもホームの色を切り替え、クリック後に戻す", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-16T09:00:00.000Z"));
  const store = createAppStore();
  store.getState().setMainView(MAIN_VIEW.DATE);
  store.getState().handleClickHome();
  render(
    <AppStoreProvider store={store}>
      <StatusBarHome />
    </AppStoreProvider>,
  );
  const home = screen.getByRole("button", { name: "ホーム" });
  expect(home.classList.contains("mfdi-home-action--active")).toBe(false);

  // 意図: granularity や絞り込みが同じでも、日付の購読で再描画されることを検証する。
  act(() => store.getState().handleClickMovePrevious());
  expect(home.classList.contains("mfdi-home-action--active")).toBe(true);
  fireEvent.click(home);
  expect(home.classList.contains("mfdi-home-action--active")).toBe(false);
  expect(store.getState().date.format("YYYY-MM-DD")).toBe("2026-03-01");

  act(() => store.getState().setActiveTag("IT"));
  expect(home.classList.contains("mfdi-home-action--active")).toBe(true);
  fireEvent.click(home);
  expect(home.classList.contains("mfdi-home-action--active")).toBe(false);
});
