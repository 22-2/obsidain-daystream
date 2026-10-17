import { obsidianMoment } from "src/core/platform/obsidian-globals";
import { resolveWriteDate, resolveWriteGranularity } from "src/features/workspace/utils/write-context";
import { describe, expect, it } from "vitest";

describe("write context", () => {
  it("タイムラインでは日次ノートと今日を使う", () => {
    const effectiveDate = obsidianMoment("2026-03-01T12:00:00");
    const now = obsidianMoment("2026-03-15T12:00:00");

    expect(resolveWriteGranularity("timeline", "month")).toBe("day");
    expect(resolveWriteDate("timeline", effectiveDate, now)).toBe(now);
  });

  it("日付ビューでは選択中のGranularityと日付を維持する", () => {
    const effectiveDate = obsidianMoment("2026-03-01T12:00:00");
    const now = obsidianMoment("2026-03-15T12:00:00");

    expect(resolveWriteGranularity("focus", "month")).toBe("month");
    expect(resolveWriteDate("focus", effectiveDate, now)).toBe(effectiveDate);
  });
});
