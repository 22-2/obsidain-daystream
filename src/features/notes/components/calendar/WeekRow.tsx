import type React from "react";
import { DayCell } from "src/features/notes/components/calendar/DayCell";
import {
  isCalendarDateSelected,
  isCalendarDaySelected,
  isCalendarWeekSelected,
} from "src/features/notes/components/calendar/selection";
import type { WeekRowProps } from "src/features/notes/components/calendar/types";
import { Box } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";
import { GRANULARITY_CONFIG, type Granularity } from "src/features/workspace/config/granularity-config";

export const WeekRow: React.FC<WeekRowProps> = ({
  week,
  date,
  granularity,
  rangeStart,
  rangeEnd,
  viewDate,
  dateFilter,
  isDateTabActive,
  activityDates,
  onSelectDay,
  onSelectWeek,
  onClickHome,
}) => {
  const selectionState = { date, granularity: granularity as Granularity, dateFilter };
  const isWeekSelected = isCalendarWeekSelected(selectionState, week[0]);
  const isSingleDaySelected = isCalendarDaySelected(selectionState);

  // 意図: 月全体の範囲表示は日付タブ専用にし、他タブのサイドバーでは選択日だけを示す。
  const showRangeHighlight =
    GRANULARITY_CONFIG[granularity as Granularity].showCalendarRangeHighlight &&
    (granularity !== "month" || isDateTabActive);

  return (
    <>
      <Box
        className={cn(
          "mini-calendar__week-number cursor-pointer h-[var(--daystream-calendar-cell-size)] py-0 text-[length:var(--daystream-calendar-cell-font-size)] flex items-center justify-center border rounded-[4px] transition-colors",
          "hover:bg-[color-mix(in_srgb,var(--color-accent),transparent_75%)]",
          isWeekSelected
            ? "text-[var(--color-accent)] border-[var(--color-accent)]"
            : "text-[var(--text-muted)] border-transparent",
        )}
        onClick={() => {
          // 同じ週を再クリックしたときは「絞り込み解除」の意図としてHomeへ戻す。
          if (isWeekSelected) {
            onClickHome();
            return;
          }
          onSelectWeek(week[0]);
        }}
      >
        {week[0].isoWeek()}
      </Box>

      {week.map((day) => (
        <DayCell
          key={day.format("YYYY-MM-DD")}
          day={day}
          isSelectedDay={isCalendarDateSelected(selectionState, day)}
          isInSelectedRange={day.isBetween(rangeStart, rangeEnd, "day", "[]")}
          isCurrentMonth={day.isSame(viewDate, "month")}
          hasPost={activityDates.has(day.format("YYYY-MM-DD"))}
          showRangeHighlight={showRangeHighlight}
          onClick={(clickedDay) => {
            // 同じ日セルの再クリックは「絞り込み解除」の意図としてHomeへ戻す。
            if (isSingleDaySelected && clickedDay.isSame(date, "day")) {
              onClickHome();
              return;
            }
            onSelectDay(clickedDay);
          }}
        />
      ))}
    </>
  );
};
