import { describe, expect, it } from "vitest";
import { toIconCssSize } from "src/ui/components/common/icon-size";

describe("toIconCssSize", () => {
  it("数値を px の CSS 長さへ変換する", () => {
    expect(toIconCssSize(16)).toBe("16px");
  });

  it("CSS の長さ文字列はそのまま使う", () => {
    expect(toIconCssSize("1.25em")).toBe("1.25em");
    expect(toIconCssSize("16px")).toBe("16px");
  });
});
