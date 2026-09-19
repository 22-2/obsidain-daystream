import { describe, expect, it } from "vitest";
import { normalizeCtrlEnterSendMode } from "src/settings";

describe("normalizeCtrlEnterSendMode", () => {
  it("旧設定の true と新しい有効値を展開前のみ有効へ揃える", () => {
    expect(normalizeCtrlEnterSendMode(true)).toBe("collapsed_only");
    expect(normalizeCtrlEnterSendMode("collapsed_only")).toBe("collapsed_only");
  });

  it("旧設定の false と不正値を無効へ揃える", () => {
    expect(normalizeCtrlEnterSendMode(false)).toBe("disabled");
    expect(normalizeCtrlEnterSendMode("unexpected")).toBe("disabled");
  });
});
