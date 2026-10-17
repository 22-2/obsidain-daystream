import type React from "react";
import { NavButton } from "src/core/ui/components/common/NavButton";
import { getCalendarNavigationSelection } from "src/features/notes/components/calendar/selection";
import { cn } from "src/core/ui/components/primitives/utils";
import type { Granularity } from "src/features/workspace/config/granularity-config";

// ─────────────────────────────────────────────
// サブコンポーネント (Tailwind化)
// ─────────────────────────────────────────────
export const CalendarHeader: React.FC<{
  viewDate: moment.Moment;
  date: moment.Moment;
  granularity: Granularity;
  dateFilter: string;
  onPrev: () => void;
  onNext: () => void;
  onSelectYear: (e: React.MouseEvent) => void;
  onSelectMonth: (e: React.MouseEvent) => void;
}> = ({ viewDate, date, granularity, dateFilter, onPrev, onNext, onSelectYear, onSelectMonth }) => {
  const navigationSelection = getCalendarNavigationSelection(
    { date, granularity, dateFilter },
    viewDate,
  );
  const periodLabelClass =
    "mini-calendar__period-label inline-flex min-h-[var(--dstr-calendar-header-height)] items-center rounded-[4px] px-[4px] text-[length:var(--dstr-calendar-header-font-size)] font-bold leading-[var(--dstr-calendar-header-height)] cursor-pointer hover:bg-[var(--background-modifier-hover)]";

  return (
    <div className="mini-calendar__header flex w-full justify-between items-center px-0 pb-2">
      <div className="mini-calendar__month-label flex items-center gap-[var(--dstr-calendar-header-gap)] ml-[var(--dstr-calendar-header-margin-left)]">
        <span
          className={cn(
            periodLabelClass,
            "mini-calendar__year-label",
            navigationSelection.year ? "text-[var(--color-accent)]" : "text-[var(--text-normal)]",
          )}
          onClick={onSelectYear}
        >
          {viewDate.format("YYYY年")}
        </span>
        <span
          className={cn(
            periodLabelClass,
            "mini-calendar__month-value",
            navigationSelection.month ? "text-[var(--color-accent)]" : "text-[var(--text-normal)]",
          )}
          onClick={onSelectMonth}
        >
          {viewDate.format("M月")}
        </span>
      </div>
      <div className="mini-calendar__nav flex items-center gap-[var(--dstr-calendar-nav-gap)]">
        {(["left", "right"] as const).map((direction) => (
          <NavButton
            key={direction}
            direction={direction}
            onClick={direction === "left" ? onPrev : onNext}
            className="mini-calendar__nav-button size-[var(--dstr-calendar-header-height)] p-[var(--dstr-calendar-nav-padding)]"
          />
        ))}
      </div>
    </div>
  );
};
