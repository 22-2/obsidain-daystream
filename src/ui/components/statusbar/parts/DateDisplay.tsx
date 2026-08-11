import type { FC } from "react";
import { useMemo } from "react";
import { Box } from "src/ui/components/primitives";
import {
  useCapabilities,
  useCurrentTime,
  useFilterMenu,
  useGranularityMenu,
  useSettings,
} from "src/ui/components/statusbar/parts/hooks";
import { UnderlinedClickable } from "src/ui/components/statusbar/parts/UnderlinedClickable";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import type { Granularity } from "src/ui/types";
import { isTimelineView } from "src/ui/utils/view-mode";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getDateLabel({
  isFixedNote,
  currentTime,
  date,
  granularity,
  dateFilter,
}: {
  isFixedNote: boolean;
  currentTime: moment.Moment;
  date: moment.Moment;
  granularity: Granularity;
  dateFilter: string;
}): string {
  // fixedノートでは選択日ではなく「いま」を基準に絞るため、見出しも現在日時を表示する。
  if (isFixedNote) {
    return currentTime.format("YYYY-MM-DD HH:mm");
  }

  if (dateFilter === "this_month") {
    return date.format(GRANULARITY_CONFIG.month.displayFormat);
  }

  if (dateFilter === "this_year") {
    return date.format(GRANULARITY_CONFIG.year.displayFormat);
  }

  if (granularity !== "day" || dateFilter === "today") {
    return date.format(GRANULARITY_CONFIG[granularity].displayFormat);
  }

  const format = GRANULARITY_CONFIG.day.displayFormat;

  if (dateFilter === "this_week") {
    const start = date.clone().startOf("isoWeek");
    const end = date.clone().endOf("isoWeek");
    return `${start.format(format)} - ${end.format(format)}`;
  }

  const days = parseInt(dateFilter);
  if (!isNaN(days)) {
    const start = date.clone().subtract(days - 1, "days");
    return `${start.format(format)} - ${date.clone().format(format)}`;
  }

  return date.format(GRANULARITY_CONFIG[granularity].displayFormat);
}

// ─── component ───────────────────────────────────────────────────────────────

export const DateDisplay: FC = () => {
  const { date, granularity, dateFilter, displayMode, viewNoteMode } = useSettings();

  const onClick = useFilterMenu();
  const onContextMenu = useGranularityMenu();

  const isFixedNote = viewNoteMode === "fixed";
  const currentTime = useCurrentTime(isFixedNote);
  const capabilities = useCapabilities(viewNoteMode);

  const dateLabel = useMemo(
    () => getDateLabel({ isFixedNote, currentTime, date, granularity, dateFilter }),
    [isFixedNote, currentTime, date, granularity, dateFilter],
  );

  if (
    isTimelineView(displayMode) ||
    (!capabilities.supportsDateNavigation && !capabilities.supportsPeriodMenus)
  )
    return null;

  return (
    <Box>
      <UnderlinedClickable
        onClick={onClick}
        onContextMenu={capabilities.supportsDateNavigation ? onContextMenu : undefined}
      >
        {dateLabel}
      </UnderlinedClickable>
    </Box>
  );
};
