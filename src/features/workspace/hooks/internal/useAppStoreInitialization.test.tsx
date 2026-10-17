import { act, cleanup, renderHook } from "@testing-library/react";
import { DSTRStorage } from "src/core/storage";
import { createLocalStorageHost } from "src/__mocks__/local-storage-host";
import { DEFAULT_SETTINGS } from "src/core/domain/settings";
import { INPUT_AREA_SIZE, MAIN_VIEW } from "src/features/workspace/config/constants";
import { useAppStoreInitialization } from "src/features/workspace/hooks/internal/useAppStoreInitialization";
import { createAppStore } from "src/features/workspace/store/appStore";
import { afterEach, describe, expect, it } from "vitest";

type AppShell = Parameters<typeof useAppStoreInitialization>[0]["shell"];

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("useAppStoreInitialization", () => {
  it.each(["default", "full"] as const)(
    "展開モードを %s に変更しても最大化と現在の操作状態を維持する",
    (mode) => {
      const store = createAppStore();
      const storage = new DSTRStorage(createLocalStorageHost("expansion-test"));
      const shell = {} as AppShell;
      const { rerender } = renderHook(
        ({ settings }) =>
          useAppStoreInitialization({ shell, settings, storage }, store),
        { initialProps: { settings: { ...DEFAULT_SETTINGS } } },
      );
      act(() => {
        store.getState().setInputAreaSize(INPUT_AREA_SIZE.MAXIMIZED);
        store.setState({
          mainView: MAIN_VIEW.SEARCH,
          searchQuery: "current query",
        });
      });
      const date = store.getState().date;
      const settings = { ...DEFAULT_SETTINGS, editorExpansionMode: mode };

      // 空の入力でも最大化を維持し、保存済みサイズの再復元に依存しないことを確認する。
      rerender({ settings });

      expect(store.getState().pluginSettings).toBe(settings);
      expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.MAXIMIZED);
      expect(store.getState().mainView).toBe(MAIN_VIEW.SEARCH);
      expect(store.getState().searchQuery).toBe("current query");
      expect(store.getState().date).toBe(date);
    },
  );

  it("初回は保存済み入力を復元し、設定更新では現在の入力を復元し直さない", () => {
    const store = createAppStore();
    const storage = new DSTRStorage(createLocalStorageHost("initialization-test"));
    const shell = {} as AppShell;
    store.setState({ storage });
    store.getState().replaceInput("saved input");
    store.setState({ inputSnapshot: "" });
    const { rerender } = renderHook(
      ({ settings }) =>
        useAppStoreInitialization({ shell, settings, storage }, store),
      { initialProps: { settings: { ...DEFAULT_SETTINGS } } },
    );
    expect(store.getState().inputSnapshot).toBe("saved input");
    act(() => store.getState().replaceInput("current input"));
    const version = store.getState().inputSnapshotVersion;

    rerender({
      settings: { ...DEFAULT_SETTINGS, editorExpansionMode: "full" },
    });

    expect(store.getState().inputSnapshot).toBe("current input");
    expect(store.getState().inputSnapshotVersion).toBe(version);
  });
});
