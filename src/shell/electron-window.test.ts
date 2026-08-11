import { restoreAndFocusElectronWindow, type ElectronWindowLike } from "src/shell/electron-window";
import { describe, expect, it, vi } from "vitest";

describe("restoreAndFocusElectronWindow", () => {
  it("最小化中なら復元してからフォーカスする", () => {
    const calls: string[] = [];
    const currentWindow: ElectronWindowLike = {
      isMinimized: () => true,
      restore: () => calls.push("restore"),
      show: () => calls.push("show"),
      focus: () => calls.push("focus"),
    };

    expect(restoreAndFocusElectronWindow(() => currentWindow)).toBe(true);
    expect(calls).toEqual(["restore", "show", "focus"]);
  });

  it("ウィンドウを取得できない環境では失敗扱いにする", () => {
    expect(restoreAndFocusElectronWindow(() => null)).toBe(false);
  });

  it("Electron API の例外を UI へ漏らさない", () => {
    const resolveWindow = vi.fn(() => {
      throw new Error("unsupported");
    });

    expect(restoreAndFocusElectronWindow(resolveWindow)).toBe(false);
  });
});
