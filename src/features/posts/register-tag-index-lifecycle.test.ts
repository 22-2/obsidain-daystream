import { shouldRunFullScan } from "src/features/posts/register-tag-index-lifecycle";
import { describe, expect, it } from "vitest";

// 現在時刻は vitest.setup.ts の 2026-03-02T16:00:00+09:00
describe("shouldRunFullScan", () => {
  it("DB にスキャン記録が無い（空の DB）ならスキャンする", () => {
    expect(shouldRunFullScan(undefined, 24)).toBe(true);
  });

  it("前回スキャンから間隔が経っていなければスキャンしない", () => {
    expect(shouldRunFullScan("2026-03-02T10:00:00.000+09:00", 24)).toBe(false);
  });

  it("前回スキャンから間隔以上経っていればスキャンする", () => {
    expect(shouldRunFullScan("2026-03-01T16:00:00.000+09:00", 24)).toBe(true);
  });

  it("間隔が 0 なら毎回スキャンする", () => {
    expect(shouldRunFullScan("2026-03-02T16:00:00.000+09:00", 0)).toBe(true);
  });
});
