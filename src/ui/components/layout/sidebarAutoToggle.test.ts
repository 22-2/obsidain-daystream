import {
  getSidebarAutoToggleState,
  type SidebarAutoToggleParams,
} from "src/ui/components/layout/sidebarAutoToggle";
import { describe, expect, it } from "vitest";

function resolve(params: Partial<SidebarAutoToggleParams>) {
  return getSidebarAutoToggleState({
    enabled: true,
    previousWidth: 1200,
    nextWidth: 1200,
    ...params,
  });
}

describe("getSidebarAutoToggleState", () => {
  it("設定がオフのときは自動開閉しない", () => {
    expect(resolve({ enabled: false, previousWidth: 1500, nextWidth: 1000 })).toBeNull();
    expect(resolve({ enabled: false, previousWidth: 1000, nextWidth: 1500 })).toBeNull();
  });

  it("1100px 以下へ跨いだときは閉じる", () => {
    expect(resolve({ previousWidth: 1200, nextWidth: 1100 })).toBe(false);
  });

  it("1400px 超へ跨いだときは開く", () => {
    expect(resolve({ previousWidth: 1400, nextWidth: 1401 })).toBe(true);
  });

  it("閾値を跨がなければ状態を変えない", () => {
    expect(resolve({ previousWidth: 1000, nextWidth: 1090 })).toBeNull();
    expect(resolve({ previousWidth: 1450, nextWidth: 1500 })).toBeNull();
  });
});
