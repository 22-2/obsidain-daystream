import { useEffect, useMemo, useRef, useState } from "react";
import { getPeriodicNoteDate, listPeriodicNotes } from "src/core/note-source";
import type { Week } from "src/ui/components/calendar/types";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { DATE_FILTER_IDS } from "src/ui/config/filter-config";
import { getGranularityRange } from "src/ui/config/granularity-config";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { useAppStore } from "src/ui/store/appStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import useSWR from "swr";
import { useShallow } from "zustand/shallow";

// ─────────────────────────────────────────────
// 純粋な計算関数 (変更なし)
// ─────────────────────────────────────────────
function buildWeeksInMonth(viewDate: moment.Moment): Week[] {
  const startDay = viewDate.clone().startOf("month").startOf("isoWeek");
  const endDay = viewDate.clone().endOf("month").endOf("isoWeek");
  const days: moment.Moment[] = [];

  const cursor = startDay.clone();
  while (cursor.isSameOrBefore(endDay, "day")) {
    days.push(cursor.clone());
    cursor.add(1, "day");
  }

  const weeks: Week[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}
// ─────────────────────────────────────────────
// カスタムフック (変更なし)
// ─────────────────────────────────────────────
export function useMiniCalendar() {
  const shell = useAppStore((s) => s.shell);
  const {
    date,
    setDate,
    granularity,
    setGranularity,
    dateFilter,
    setDateFilter,
    setDisplayMode,
    activeTopic,
    handleClickHome,
  } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      setDate: s.setDate,
      granularity: s.granularity,
      setGranularity: s.setGranularity,
      dateFilter: s.dateFilter,
      setDateFilter: s.setDateFilter,
      setDisplayMode: s.setDisplayMode,
      activeTopic: s.activeTopic,
      handleClickHome: s.handleClickHome,
    })),
  );

  const dbService = useMFDIDB();
  const { data: dbActiveDates = new Set<string>() } = useSWR(
    ["activeDates"],
    async () => {
      const dates = await dbService.getAllActiveDates();
      return new Set(dates);
    },
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const [viewDate, setViewDate] = useState(() => window.moment(date).startOf("month"));

  const prevDateRef = useRef(date);
  const skipNextViewUpdate = useRef(false);

  useEffect(() => {
    if (skipNextViewUpdate.current) {
      skipNextViewUpdate.current = false;
      prevDateRef.current = date;
      return;
    }
    if (!date.isSame(prevDateRef.current, "month")) {
      setViewDate(window.moment(date).startOf("month"));
    }
    prevDateRef.current = date;
  }, [date]);

  const handlePrevMonth = () => {
    setViewDate((prev) => prev.clone().subtract(1, "month"));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => prev.clone().add(1, "month"));
  };

  const handleSelectDay = (day: moment.Moment) => {
    if (!day.isSame(viewDate, "month")) {
      skipNextViewUpdate.current = true;
    }
    setDisplayMode(DISPLAY_MODE.FOCUS);
    setGranularity("day");
    setDateFilter("today");
    setDate(day.clone());
  };

  const handleSelectWeek = (weekStart: moment.Moment) => {
    if (!weekStart.isSame(viewDate, "month")) {
      skipNextViewUpdate.current = true;
    }
    setDisplayMode(DISPLAY_MODE.FOCUS);
    setGranularity("day");
    setDateFilter("this_week");
    setDate(weekStart.clone());
  };

  const handleSelectYear = () => {
    const isSelectedYear =
      dateFilter === DATE_FILTER_IDS.THIS_YEAR && date.isSame(viewDate, "year");

    // 同じ年を再クリックした時は、絞り込みを解除してHomeへ戻す。
    if (isSelectedYear) {
      handleClickHome();
      return;
    }

    // 表示スケールは維持し、年の範囲だけを切り替える。
    setDisplayMode(DISPLAY_MODE.FOCUS);
    setDateFilter(DATE_FILTER_IDS.THIS_YEAR);
    setDate(viewDate.clone());
  };

  const handleSelectMonth = () => {
    const isSelectedMonth =
      dateFilter === DATE_FILTER_IDS.THIS_MONTH && date.isSame(viewDate, "month");

    // 同じ月を再クリックした時は、絞り込みを解除してHomeへ戻す。
    if (isSelectedMonth) {
      handleClickHome();
      return;
    }

    // 表示スケールは維持し、月の範囲だけを切り替える。
    setDisplayMode(DISPLAY_MODE.FOCUS);
    setDateFilter(DATE_FILTER_IDS.THIS_MONTH);
    setDate(viewDate.clone());
  };

  const activityDates = useMemo(() => {
    if (!shell) return new Set<string>();
    const notes = listPeriodicNotes(shell, "day", activeTopic);
    const dates = new Set<string>(dbActiveDates);
    Object.values(notes).forEach((file) => {
      const d = getPeriodicNoteDate(file, "day", shell, activeTopic);
      if (d) dates.add(d.format("YYYY-MM-DD"));
    });
    return dates;
  }, [shell, activeTopic, dbActiveDates]);

  const weeks = useMemo(() => buildWeeksInMonth(viewDate), [viewDate]);
  const { rangeStart, rangeEnd } = getGranularityRange(date, granularity, dateFilter as string);

  return {
    date,
    granularity,
    viewDate,
    weeks,
    rangeStart,
    rangeEnd,
    dateFilter,
    activityDates,
    handlePrevMonth,
    handleNextMonth,
    handleSelectDay,
    handleSelectWeek,
    handleSelectYear,
    handleSelectMonth,
    handleClickHome,
    setDate,
    setGranularity,
    setDateFilter,
  };
}
