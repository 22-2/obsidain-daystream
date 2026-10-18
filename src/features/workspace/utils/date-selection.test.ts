import { describe, expect, it } from "vitest";
import { obsidianMoment } from "src/core/platform/obsidian-globals";
import { matchesDateSelection } from "src/features/workspace/utils/date-selection";

describe("matchesDateSelection", () => {
  it("年未指定の2月29日はうるう年の投稿に一致する", () => {
    const selection = { year: null, month: 2, day: 29 };
    expect(matchesDateSelection(obsidianMoment("2024-02-29"), selection)).toBe(true);
    expect(matchesDateSelection(obsidianMoment("2020-02-29"), selection)).toBe(true);
    expect(matchesDateSelection(obsidianMoment("2025-02-28"), selection)).toBe(false);
  });

  it("UTCの日付ではなくローカル日付で照合する", () => {
    const selection = { year: null, month: 10, day: 19 };
    expect(matchesDateSelection(obsidianMoment("2025-10-18T15:00:00Z"), selection)).toBe(true);
    expect(matchesDateSelection(obsidianMoment("2025-10-19T15:00:00Z"), selection)).toBe(false);
  });
});
