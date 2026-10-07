// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

export type Week = moment.Moment[];

export interface DayCellProps {
  day: moment.Moment;
  isSelectedDay: boolean;
  isInSelectedRange: boolean;
  isCurrentMonth: boolean;
  hasPost: boolean;
  onClick: (day: moment.Moment) => void;
}

export interface WeekRowProps {
  week: Week;
  weekIndex: number;
  date: moment.Moment;
  granularity: string;
  rangeStart: moment.Moment;
  rangeEnd: moment.Moment;
  viewDate: moment.Moment;
  dateFilter: string;
  isDateTabActive: boolean;
  activityDates: Set<string>;
  onSelectDay: (day: moment.Moment) => void;
  onSelectWeek: (weekStart: moment.Moment) => void;
  onClickHome: () => void;
}
