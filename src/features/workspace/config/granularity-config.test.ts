import {
  getGranularityRange,
  GRANULARITIES,
  GRANULARITY_CONFIG,
} from "src/features/workspace/config/granularity-config";
import { describe, expect, it } from "vitest";

// ─────────────────────────────────────────────────────────────────
// GRANULARITY_CONFIG — UI 表示設定の静的値テスト
// ─────────────────────────────────────────────────────────────────
describe("GRANULARITY_CONFIG", () => {
  it.each(GRANULARITIES)("'%s' に必要なフィールドが全て存在する", (g) => {
    const cfg = GRANULARITY_CONFIG[g];
    expect(cfg.label).toBeTruthy();
    expect(cfg.menuLabel).toBeTruthy();
    expect(cfg.todayLabel).toBeTruthy();
    expect(cfg.unit).toBe(g);
    expect(cfg.inputType).toBeTruthy();
    expect(cfg.inputFormat).toBeTruthy();
    expect(cfg.displayFormat).toBeTruthy();
    expect(cfg.inputWidthClass).toBeTruthy();
    expect(typeof cfg.parseInput).toBe("function");
    expect(typeof cfg.showWeekday).toBe("boolean");
    expect(typeof cfg.readsDirectlyFromPeriodicNote).toBe("boolean");
    expect(typeof cfg.showCalendarRangeHighlight).toBe("boolean");
    expect(cfg.settings.periodicity).toBeTruthy();
    expect(cfg.settings.source).toBeTruthy();
    expect(cfg.settings.defaultFormat).toBeTruthy();
  });

  it("day だけ showWeekday が true", () => {
    expect(GRANULARITY_CONFIG.day.showWeekday).toBe(true);
    expect(GRANULARITY_CONFIG.week.showWeekday).toBe(false);
    expect(GRANULARITY_CONFIG.month.showWeekday).toBe(false);
    expect(GRANULARITY_CONFIG.quarter.showWeekday).toBe(false);
    expect(GRANULARITY_CONFIG.year.showWeekday).toBe(false);
  });

  it("todayLabel の値が granularity ごとに正しい", () => {
    expect(GRANULARITY_CONFIG.day.todayLabel).toBe("今日");
    expect(GRANULARITY_CONFIG.week.todayLabel).toBe("今週");
    expect(GRANULARITY_CONFIG.month.todayLabel).toBe("今月");
    expect(GRANULARITY_CONFIG.quarter.todayLabel).toBe("今四半期");
    expect(GRANULARITY_CONFIG.year.todayLabel).toBe("今年");
  });

  it("quarter の期間範囲を計算できる", () => {
    const { rangeStart, rangeEnd } = getGranularityRange(
      window.moment("2026-05-12"),
      "quarter",
      "today",
    );

    expect(rangeStart.format("YYYY-MM-DD")).toBe("2026-04-01");
    expect(rangeEnd.format("YYYY-MM-DD")).toBe("2026-06-30");
  });

  it("月・年フィルターは粒度に関係なく該当範囲を計算できる", () => {
    const month = getGranularityRange(window.moment("2026-05-12"), "day", "this_month");
    expect(month.rangeStart.format("YYYY-MM-DD")).toBe("2026-05-01");
    expect(month.rangeEnd.format("YYYY-MM-DD")).toBe("2026-05-31");

    const year = getGranularityRange(window.moment("2026-05-12"), "day", "this_year");
    expect(year.rangeStart.format("YYYY-MM-DD")).toBe("2026-01-01");
    expect(year.rangeEnd.format("YYYY-MM-DD")).toBe("2026-12-31");
  });
});
