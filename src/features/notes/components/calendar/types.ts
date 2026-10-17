import type { Moment } from "moment";
// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

export type Week = Moment[];

export interface DayCellProps {
  day: Moment;
  isSelectedDay: boolean;
  isInSelectedRange: boolean;
  isCurrentMonth: boolean;
  hasPost: boolean;
  onClick: (day: Moment) => void;
}

export interface WeekRowProps {
  week: Week;
  weekIndex: number;
  date: Moment;
  granularity: string;
  rangeStart: Moment;
  rangeEnd: Moment;
  viewDate: Moment;
  dateFilter: string;
  isDateTabActive: boolean;
  activityDates: Set<string>;
  onSelectDay: (day: Moment) => void;
  onSelectWeek: (weekStart: Moment) => void;
  onClickHome: () => void;
}
