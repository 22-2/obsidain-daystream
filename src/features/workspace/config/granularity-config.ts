import { obsidianMoment } from "src/core/platform/obsidian-globals";
// ─────────────────────────────────────────────────────────────────
// UI display config — granularity ごとの表示設定

import type { Moment } from "moment";
import { GRANULARITIES, type Granularity } from "src/core/domain/granularity";
import { DATE_FILTER_IDS } from "src/features/workspace/config/filter-config";

export { GRANULARITIES, type Granularity };

interface GranularityConfigEntry {
  label: string;
  menuLabel: string;
  todayLabel: string;
  unit: Granularity;
  inputType: string;
  inputFormat: string;
  displayFormat: string;
  inputWidthClass: string;
  parseInput: (v: string) => Moment;
  showWeekday: boolean;
  readsDirectlyFromPeriodicNote: boolean;
  showCalendarRangeHighlight: boolean;
}

export const GRANULARITY_CONFIG: Record<Granularity, GranularityConfigEntry> = {
  day: {
    label: "日",
    menuLabel: "日ごと",
    todayLabel: "今日",
    unit: "day",
    inputType: "date",
    inputFormat: "YYYY-MM-DD",
    displayFormat: "YYYY年MM月DD日",
    inputWidthClass: "w-[10em]",
    parseInput: (v) => obsidianMoment(v, "YYYY-MM-DD"),
    showWeekday: true,
    readsDirectlyFromPeriodicNote: false,
    showCalendarRangeHighlight: true,
  },
  week: {
    label: "週",
    menuLabel: "週ごと",
    todayLabel: "今週",
    unit: "week",
    inputType: "week",
    inputFormat: "GGGG-[W]WW",
    displayFormat: "GGGG年 [W]WW週",
    inputWidthClass: "w-[10em]",
    parseInput: (v) => obsidianMoment(v, "GGGG-[W]WW"),
    showWeekday: false,
    readsDirectlyFromPeriodicNote: false,
    showCalendarRangeHighlight: true,
  },
  month: {
    label: "月",
    menuLabel: "月ごと",
    todayLabel: "今月",
    unit: "month",
    inputType: "month",
    inputFormat: "YYYY-MM",
    displayFormat: "YYYY年MM月",
    inputWidthClass: "w-[10em]",
    parseInput: (v) => obsidianMoment(v, "YYYY-MM"),
    showWeekday: false,
    readsDirectlyFromPeriodicNote: true,
    // 意図: 月粒度では選択した月全体をナビゲーター上でも範囲として示す。
    showCalendarRangeHighlight: true,
  },
  quarter: {
    label: "四半期",
    menuLabel: "四半期ごと",
    todayLabel: "今四半期",
    unit: "quarter",
    inputType: "text",
    inputFormat: "YYYY-[Q]Q",
    displayFormat: "YYYY年 第Q四半期",
    inputWidthClass: "w-[8em]",
    parseInput: (v) => obsidianMoment(v, "YYYY-[Q]Q"),
    showWeekday: false,
    readsDirectlyFromPeriodicNote: true,
    showCalendarRangeHighlight: false,
  },
  year: {
    label: "年",
    menuLabel: "年ごと",
    todayLabel: "今年",
    unit: "year",
    inputType: "number",
    inputFormat: "YYYY",
    displayFormat: "YYYY年",
    inputWidthClass: "w-[6.5em]",
    parseInput: (v) => obsidianMoment(v, "YYYY"),
    showWeekday: false,
    readsDirectlyFromPeriodicNote: true,
    showCalendarRangeHighlight: false,
  },
};

export function getGranularityRange(
  date: Moment,
  granularity: Granularity,
  dateFilter: string,
): { rangeStart: Moment; rangeEnd: Moment } {
  if (dateFilter === DATE_FILTER_IDS.THIS_MONTH) {
    return {
      rangeStart: date.clone().startOf("month"),
      rangeEnd: date.clone().endOf("month"),
    };
  }

  if (dateFilter === DATE_FILTER_IDS.THIS_YEAR) {
    return {
      rangeStart: date.clone().startOf("year"),
      rangeEnd: date.clone().endOf("year"),
    };
  }

  if (granularity === "week") {
    return {
      rangeStart: date.clone().startOf("isoWeek"),
      rangeEnd: date.clone().endOf("isoWeek"),
    };
  }

  if (granularity !== "day" || dateFilter === DATE_FILTER_IDS.TODAY) {
    return {
      rangeStart: date.clone().startOf(GRANULARITY_CONFIG[granularity].unit),
      rangeEnd: date.clone().endOf(GRANULARITY_CONFIG[granularity].unit),
    };
  }

  if (dateFilter === DATE_FILTER_IDS.THIS_WEEK) {
    return {
      rangeStart: date.clone().startOf("isoWeek"),
      rangeEnd: date.clone().endOf("isoWeek"),
    };
  }

  const days = Number.parseInt(dateFilter, 10);
  if (!Number.isNaN(days)) {
    return {
      rangeStart: date
        .clone()
        .subtract(days - 1, "days")
        .startOf("day"),
      rangeEnd: date.clone().endOf("day"),
    };
  }

  return {
    rangeStart: date.clone().startOf("day"),
    rangeEnd: date.clone().endOf("day"),
  };
}
