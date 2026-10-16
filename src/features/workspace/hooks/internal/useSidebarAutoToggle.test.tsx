import { act, cleanup, renderHook } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "src/core/domain/settings";
import { DaystreamStorage } from "src/core/storage";
import { useSidebarAutoToggle } from "src/features/workspace/hooks/internal/useSidebarAutoToggle";
import { createAppStore } from "src/features/workspace/store/appStore";
import { resolveInitialSettingsState } from "src/features/workspace/store/slices/settingsPersistence";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let resize: (width: number) => void;
const observers: ResizeObserverMock[] = [];

class ResizeObserverMock implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    observers.push(this);
    resize = (width) => {
      act(() =>
        callback(
          [
            {
              target: document.createElement("div"),
              contentRect: new DOMRect(0, 0, width, 600),
              borderBoxSize: [],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            },
          ],
          this,
        ),
      );
    };
  }
}

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function mountAutoToggle(
  leftPanelOpen: boolean,
  rightPanelOpen: boolean,
  enabled = true,
) {
  const store = createAppStore();
  const storage = new DaystreamStorage("sidebar-auto-toggle-test");
  store.setState({ storage });
  store.getState().setLeftPanelOpen(leftPanelOpen);
  store.getState().setRightPanelOpen(rightPanelOpen);
  const save = vi.spyOn(storage, "set");
  const containerRef = { current: document.createElement("div") };
  const hook = renderHook(
    ({ enabled }) =>
      useSidebarAutoToggle(
        containerRef,
        enabled,
        store.getState().setSidebarOpen,
      ),
    { initialProps: { enabled } },
  );
  return { ...hook, store, storage, save, containerRef };
}

describe("useSidebarAutoToggle", () => {
  it.each([
    [false, false],
    [false, true],
    [true, false],
  ])(
    "初回表示で左右の保存状態 (%s, %s) を上書きしない",
    (leftPanelOpen, rightPanelOpen) => {
      const { store, storage, save, containerRef } = mountAutoToggle(
        leftPanelOpen,
        rightPanelOpen,
      );

      resize(1600);

      expect(observers[0].observe).toHaveBeenCalledWith(containerRef.current);
      expect(store.getState()).toMatchObject({ leftPanelOpen, rightPanelOpen });
      expect(
        resolveInitialSettingsState(
          DEFAULT_SETTINGS,
          storage,
          "periodic",
          null,
        ),
      ).toMatchObject({
        leftPanelOpen,
        rightPanelOpen,
      });
      expect(save).not.toHaveBeenCalled();
    },
  );

  it.each([1000, 1250, 1600])(
    "幅 %s のタブを隠して戻しても手動の開閉状態と保存値を維持する",
    (width) => {
      const { store, storage, save } = mountAutoToggle(false, true);
      resize(width);
      // 初回表示後の手動操作も維持する。
      store.getState().setLeftPanelOpen(false);
      store.getState().setRightPanelOpen(true);
      save.mockClear();

      resize(0);
      expect(store.getState()).toMatchObject({
        leftPanelOpen: false,
        rightPanelOpen: true,
      });
      resize(width);

      expect(store.getState()).toMatchObject({
        leftPanelOpen: false,
        rightPanelOpen: true,
      });
      expect(
        resolveInitialSettingsState(
          DEFAULT_SETTINGS,
          storage,
          "periodic",
          null,
        ),
      ).toMatchObject({
        leftPanelOpen: false,
        rightPanelOpen: true,
      });
      expect(save).not.toHaveBeenCalled();
    },
  );

  it("非表示で起動してから初めて表示しても保存状態を維持する", () => {
    const { store, save } = mountAutoToggle(false, false);
    resize(0);
    resize(1600);
    expect(store.getState()).toMatchObject({
      leftPanelOpen: false,
      rightPanelOpen: false,
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("表示中に実際の幅が閾値を跨いだときは自動開閉する", () => {
    const { store } = mountAutoToggle(true, true);
    resize(1600);
    resize(1100);
    expect(store.getState()).toMatchObject({
      leftPanelOpen: false,
      rightPanelOpen: false,
    });
    resize(1400);
    expect(store.getState()).toMatchObject({
      leftPanelOpen: false,
      rightPanelOpen: false,
    });
    resize(1401);
    expect(store.getState()).toMatchObject({
      leftPanelOpen: true,
      rightPanelOpen: true,
    });
  });

  it("自動開閉が無効なら、幅が閾値を跨いでも手動の状態を維持する", () => {
    const { store, save } = mountAutoToggle(false, true, false);
    resize(1600);
    resize(1000);
    resize(1600);
    expect(store.getState()).toMatchObject({
      leftPanelOpen: false,
      rightPanelOpen: true,
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("自動開閉を有効に戻した直後は現在の幅を基準にし、終了時は監視を解除する", () => {
    const { store, save, rerender, unmount } = mountAutoToggle(
      false,
      true,
      false,
    );
    resize(1000);
    rerender({ enabled: true });
    resize(1600);
    expect(store.getState()).toMatchObject({
      leftPanelOpen: false,
      rightPanelOpen: true,
    });
    expect(save).not.toHaveBeenCalled();

    unmount();
    expect(observers[observers.length - 1].disconnect).toHaveBeenCalledOnce();
  });
});
