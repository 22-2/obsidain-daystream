import type React from "react";
import type { DayCellProps } from "src/features/notes/components/calendar/types";
import { cn } from "src/core/ui/components/primitives/utils";

type Props = DayCellProps & { showRangeHighlight: boolean };

export const DayCell: React.FC<Props> = ({
  day,
  isSelectedDay,
  isInSelectedRange,
  isCurrentMonth,
  hasPost,
  showRangeHighlight,
  onClick,
}) => {
  const isToday = day.isSame(window.moment(), "day");
  const isForeground = isCurrentMonth || isSelectedDay || isInSelectedRange || isToday;
  const effectiveInRange = showRangeHighlight && isInSelectedRange;

  // ---- className helpers ----

  const backgroundCx = isToday
    ? "bg-[var(--interactive-accent)] text-[var(--text-on-accent)]"
    : effectiveInRange
      ? "bg-[var(--interactive-normal)] text-[var(--text-color)]"
      : "bg-transparent";

  const textCx =
    !isToday && !effectiveInRange
      ? isForeground
        ? "text-[var(--text-normal)]"
        : "text-[var(--text-faint)]"
      : undefined;

  const hoverCx = isToday
    ? "hover:bg-[var(--interactive-accent-hover)]"
    : "hover:bg-[var(--interactive-normal)]";

  const dotColorCx = isToday
    ? "bg-[var(--text-on-accent)]"
    : effectiveInRange
      ? "bg-[var(--color-accent)]"
      : "bg-[var(--text-muted)]";

  // ---- render ----

  return (
    <div
      className={cn(
        "mini-calendar__day-cell relative cursor-pointer",
        "flex items-center justify-center",
        "w-[var(--mfdi-calendar-cell-size)] h-[var(--mfdi-calendar-cell-size)]",
        "transition-all duration-100 ease-in-out",
        isToday || effectiveInRange ? "font-bold" : "font-normal",
        backgroundCx,
        textCx,
        hoverCx,
      )}
      onClick={() => onClick(day)}
    >
      <div className="grid grid-rows-[1em_var(--mfdi-calendar-dot-size)] justify-items-center gap-[var(--mfdi-calendar-day-gap)]">
        <span className="leading-none">{day.date()}</span>

        <div
          className={cn(
            "h-[var(--mfdi-calendar-dot-size)] w-[var(--mfdi-calendar-dot-size)] rounded-full",
            hasPost ? dotColorCx : "bg-transparent",
          )}
        />
      </div>
    </div>
  );
};
