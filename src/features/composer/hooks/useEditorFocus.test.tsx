import { act, renderHook } from "@testing-library/react";
import { useEditorFocus } from "src/features/composer/hooks/useEditorFocus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useEditorFocus", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("編集開始・対象切り替え・再表示時にフォーカスし、通常の再描画では奪わない", () => {
    const focus = vi.fn();
    const inputRef = { current: { focus } };
    const target = { id: "post", path: "first.md" };
    const { rerender } = renderHook(
      ({ target, enabled }) => useEditorFocus(inputRef, target, enabled),
      { initialProps: { target, enabled: false } },
    );
    act(() => vi.runAllTimers());
    expect(focus).not.toHaveBeenCalled();
    rerender({ target, enabled: true });
    expect(focus).not.toHaveBeenCalled();
    act(() => vi.runAllTimers());
    expect(focus).toHaveBeenCalledTimes(1);
    rerender({ target, enabled: true });
    act(() => vi.runAllTimers());
    expect(focus).toHaveBeenCalledTimes(1);
    const nextTarget = { id: "post", path: "second.md" };
    rerender({ target: nextTarget, enabled: true });
    act(() => vi.runAllTimers());
    expect(focus).toHaveBeenCalledTimes(2);
    rerender({ target: nextTarget, enabled: false });
    rerender({ target: nextTarget, enabled: true });
    act(() => vi.runAllTimers());
    expect(focus).toHaveBeenCalledTimes(3);
  });

  it("画面を閉じたときや無効になったときは予約したフォーカスを解除する", () => {
    const focus = vi.fn();
    const inputRef = { current: { focus } };
    const { rerender, unmount } = renderHook(
      ({ enabled }) => useEditorFocus(inputRef, null, enabled),
      { initialProps: { enabled: true } },
    );
    rerender({ enabled: false });
    act(() => vi.runAllTimers());
    expect(focus).not.toHaveBeenCalled();
    rerender({ enabled: true });
    unmount();
    act(() => vi.runAllTimers());
    expect(focus).not.toHaveBeenCalled();
  });

  it("編集開始時に一覧を先頭へ戻し、通常の再描画ではスクロールしない", () => {
    const focus = vi.fn();
    const scrollTo = vi.fn();
    const inputRef = { current: { focus } };
    const container = document.createElement("div");
    container.scrollTo = scrollTo;
    const scrollContainerRef = { current: container };
    const target = { id: "post" };
    const { rerender, unmount } = renderHook(
      ({ enabled }) =>
        useEditorFocus(inputRef, target, enabled, scrollContainerRef),
      { initialProps: { enabled: false } },
    );
    act(() => vi.runAllTimers());
    expect(scrollTo).not.toHaveBeenCalled();
    rerender({ enabled: true });
    act(() => vi.runAllTimers());
    expect(focus).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
    rerender({ enabled: true });
    act(() => vi.runAllTimers());
    expect(scrollTo).toHaveBeenCalledTimes(1);
    rerender({ enabled: false });
    rerender({ enabled: true });
    unmount();
    act(() => vi.runAllTimers());
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
