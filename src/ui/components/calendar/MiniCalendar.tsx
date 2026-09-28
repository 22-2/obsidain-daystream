import React, { useEffect } from "react";
import { CalendarHeader } from "src/ui/components/calendar/CalendarHeader";
import { useMiniCalendar } from "src/ui/components/calendar/utils";
import { WeekRow } from "src/ui/components/calendar/WeekRow";

const WEEK_DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;

// ─────────────────────────────────────────────
// メインコンポーネント (Tailwind化)
// ─────────────────────────────────────────────

export const MiniCalendar: React.FC<{
  onViewDateChange?: (date: moment.Moment) => void;
}> = ({ onViewDateChange }) => {
  const {
    date,
    granularity,
    viewDate,
    weeks,
    rangeStart,
    rangeEnd,
    dateFilter,
    isDateTabActive,
    activityDates,
    handlePrevMonth,
    handleNextMonth,
    handleSelectDay,
    handleSelectWeek,
    handleSelectYear,
    handleSelectMonth,
    handleClickHome,
  } = useMiniCalendar();

  useEffect(() => {
    onViewDateChange?.(viewDate);
  }, [viewDate, onViewDateChange]);

  return (
    <div className="mini-calendar mx-auto flex w-[var(--mfdi-calendar-width)] max-w-full flex-col">
      <CalendarHeader
        viewDate={viewDate}
        date={date}
        granularity={granularity}
        dateFilter={dateFilter as string}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
        onSelectYear={(e) => {
          e.stopPropagation();
          handleSelectYear();
        }}
        onSelectMonth={(e) => {
          e.stopPropagation();
          handleSelectMonth();
        }}
      />

      <div className="mini-calendar__grid grid grid-cols-[repeat(8,var(--mfdi-calendar-cell-size))] gap-[var(--mfdi-calendar-grid-gap)] text-center text-[length:var(--mfdi-calendar-cell-font-size)]">
        {/* 曜日ヘッダー */}
        <div /> {/* 週番号列のスペーサー */}
        {WEEK_DAY_LABELS.map((label) => (
          <div
            key={label}
            className="mini-calendar__weekday-label text-[var(--text-muted)] text-[length:var(--mfdi-calendar-weekday-font-size)] py-[var(--mfdi-calendar-weekday-padding-block)]"
          >
            {label}
          </div>
        ))}
        {/* 週ごとの行 */}
        {weeks.map((week, wIdx) => (
          <WeekRow
            key={wIdx}
            week={week}
            weekIndex={wIdx}
            date={date}
            granularity={granularity}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            viewDate={viewDate}
            dateFilter={dateFilter as string}
            isDateTabActive={isDateTabActive}
            activityDates={activityDates}
            onSelectDay={handleSelectDay}
            onSelectWeek={handleSelectWeek}
            onClickHome={handleClickHome}
          />
        ))}
      </div>
    </div>
  );
};
