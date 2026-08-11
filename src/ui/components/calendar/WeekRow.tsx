import type React from "react";
import { DayCell } from "src/ui/components/calendar/DayCell";
import type { WeekRowProps } from "src/ui/components/calendar/types";
import { Box } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import { GRANULARITY_CONFIG, type Granularity } from "src/ui/config/granularity-config";

export const WeekRow: React.FC<WeekRowProps> = ({
  week,
  date,
  granularity,
  rangeStart,
  rangeEnd,
  viewDate,
  dateFilter,
  activityDates,
  onSelectDay,
  onSelectWeek,
  onClickHome,
}) => {
  const isWeekSelected =
    (granularity === "week" || (granularity === "day" && dateFilter === "this_week")) &&
    week[0].isSame(date, "isoWeek");
  const isSingleDaySelected = granularity === "day" && dateFilter === "today";

  const showRangeHighlight =
    GRANULARITY_CONFIG[granularity as Granularity].showCalendarRangeHighlight;

  return (
    <>
      <Box
        className={cn(
          "mini-calendar__week-number cursor-pointer h-[var(--mfdi-calendar-cell-size)] py-0 text-[length:var(--mfdi-calendar-cell-font-size)] flex items-center justify-center border rounded-[4px] transition-colors",
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
          isSelectedDay={day.isSame(date, "day")}
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
