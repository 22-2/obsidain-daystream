import type { Granularity } from "src/ui/config/granularity-config";
import { DATE_FILTER_IDS } from "src/ui/config/filter-config";
import type { DateFilter } from "src/ui/types";

export interface CalendarSelectionState {
  date: moment.Moment;
  granularity: Granularity;
  dateFilter: string;
}

export interface CalendarNavigationSelection {
  year: boolean;
  month: boolean;
}

/**
 * 意図: ナビゲーターの各表示箇所で条件がずれないよう、同じ状態から選択表示をまとめて導出する。
 */
export function getCalendarNavigationSelection(
  state: CalendarSelectionState,
  viewDate: moment.Moment,
): CalendarNavigationSelection {
  const sameYear = viewDate.isSame(state.date, "year");
  const sameMonth = viewDate.isSame(state.date, "month");

  return {
    year:
      state.dateFilter === DATE_FILTER_IDS.THIS_YEAR
        ? sameYear
        : ((state.granularity === "year" || state.granularity === "quarter") && sameYear) ||
          (state.granularity === "month" && sameMonth),
    month:
      state.dateFilter === DATE_FILTER_IDS.THIS_MONTH
        ? sameMonth
        : state.granularity === "month" && sameMonth,
  };
}

export function isCalendarScaleSelected(
  state: CalendarSelectionState,
  targetDate: moment.Moment,
  targetGranularity: Granularity,
): boolean {
  return (
    state.granularity === targetGranularity &&
    state.date.isSame(
      targetDate,
      targetGranularity === "week" ? "isoWeek" : targetGranularity,
    )
  );
}

export function isCalendarWeekSelected(
  state: CalendarSelectionState,
  weekStart: moment.Moment,
): boolean {
  return (
    (state.granularity === "week" ||
      (state.granularity === "day" && state.dateFilter === DATE_FILTER_IDS.THIS_WEEK)) &&
    state.date.isSame(weekStart, "isoWeek")
  );
}

export function isCalendarDaySelected(state: CalendarSelectionState): boolean {
  return state.granularity === "day" && state.dateFilter === DATE_FILTER_IDS.TODAY;
}

export function isCalendarDateSelected(
  state: CalendarSelectionState,
  day: moment.Moment,
): boolean {
  return day.isSame(state.date, "day");
}

export interface CalendarSelectionActions {
  setCalendarSelection: (selection: CalendarSelectionTarget) => void;
}

export interface CalendarSelectionTarget {
  date: moment.Moment;
  dateFilter: DateFilter;
  granularity?: Granularity;
}

/**
 * 意図: カレンダーとサイドバーの選択操作が粒度・期間・基準日を同じ順序で同期するようにする。
 */
export function applyCalendarSelection(
  actions: CalendarSelectionActions,
  target: CalendarSelectionTarget,
): void {
  actions.setCalendarSelection({ ...target, date: target.date.clone() });
}
