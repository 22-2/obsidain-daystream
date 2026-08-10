import { useCallback, useEffect, useState } from "react";
import { resolvePeriodicNote } from "src/core/note-source";
import { parseThinoEntries } from "src/core/thino";
import { NavButton } from "src/ui/components/common/NavButton";
import { PanelSection } from "src/ui/components/layout/PanelPrimitives";
import {
  SidebarItemCount,
  SidebarTextButton,
} from "src/ui/components/layout/SidebarPrimitives";
import { HStack, Spinner, Text, VStack } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import {
  GRANULARITY_CONFIG,
  type Granularity,
} from "src/ui/config/granularity-config";
import { useAppStore } from "src/ui/store/appStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

interface Counts {
  posts: number;
  tasks: number;
}

function buildScaleKey(date: moment.Moment, granularity: Granularity): string {
  return `${granularity}-${date.clone().startOf(granularity).format(GRANULARITY_CONFIG[granularity].inputFormat)}`;
}

function formatScaleLabel(
  date: moment.Moment,
  granularity: Granularity,
): string {
  if (granularity === "quarter") {
    return date
      .clone()
      .startOf("quarter")
      .format(GRANULARITY_CONFIG.quarter.inputFormat);
  }

  if (granularity === "month") {
    return date.format("YYYY-MM");
  }

  return date.format(GRANULARITY_CONFIG[granularity].inputFormat);
}

export const SidebarScales: React.FC<{
  viewedDate?: moment.Moment;
  onViewDateChange?: (next: moment.Moment) => void;
}> = ({ viewedDate, onViewDateChange }) => {
  const shell = useAppStore((s) => s.shell);
  const {
    date,
    setDate,
    setGranularity,
    setDateFilter,
    granularity,
    activeTopic,
    handleClickHome,
  } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      setDate: s.setDate,
      setGranularity: s.setGranularity,
      setDateFilter: s.setDateFilter,
      granularity: s.granularity,
      activeTopic: s.activeTopic,
      handleClickHome: s.handleClickHome,
    })),
  );

  const baseDate = viewedDate || date;
  const monthStart = baseDate.clone().startOf("month");
  const monthEnd = baseDate.clone().endOf("month");

  const weeks: moment.Moment[] = [];
  const cursor = monthStart.clone().startOf("isoWeek");
  while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, "day")) {
    weeks.push(cursor.clone());
    cursor.add(1, "week");
  }

  const [countsMap, setCountsMap] = useState<Record<string, Counts>>({});
  const [loading, setLoading] = useState(false);

  const getCountsForPeriod = useCallback(
    async (d: moment.Moment, g: "week" | "month" | "quarter" | "year") => {
      if (!shell) return { posts: 0, tasks: 0 };
      const note = resolvePeriodicNote(shell, d, g, activeTopic);
      if (!note) return { posts: 0, tasks: 0 };

      const content = await shell.cachedReadFile(note);
      const posts = parseThinoEntries(content).length;
      const tasks = (await shell.getTasks(note))?.length || 0;
      return { posts, tasks };
    },
    [shell, activeTopic],
  );

  useEffect(() => {
    let isMounted = true;
    const fetchAllCounts = async () => {
      setLoading(true);
      const newCounts: Record<string, Counts> = {};

      const [mCounts, qCounts, yCounts] = await Promise.all([
        getCountsForPeriod(baseDate, "month"),
        getCountsForPeriod(baseDate, "quarter"),
        getCountsForPeriod(baseDate, "year"),
      ]);
      newCounts[buildScaleKey(baseDate, "month")] = mCounts;
      newCounts[buildScaleKey(baseDate, "quarter")] = qCounts;
      newCounts[buildScaleKey(baseDate, "year")] = yCounts;

      const wPromises = weeks.map(async (w) => {
        const c = await getCountsForPeriod(w, "week");
        return { key: buildScaleKey(w, "week"), counts: c };
      });
      const wResults = await Promise.all(wPromises);
      wResults.forEach((r) => {
        newCounts[r.key] = r.counts;
      });

      if (isMounted) {
        setCountsMap(newCounts);
        setLoading(false);
      }
    };

    fetchAllCounts();
    return () => {
      isMounted = false;
    };
  }, [baseDate, activeTopic, getCountsForPeriod]);

  const renderCountBadge = (counts?: Counts) => {
    if (!counts || (counts.posts === 0 && counts.tasks === 0)) return null;
    return (
      <SidebarItemCount>
        ({counts.posts}p / {counts.tasks}t)
      </SidebarItemCount>
    );
  };

  const handleMoveViewMonth = useCallback(
    (delta: -1 | 1) => {
      // 意図: サイドバー見出しの左右操作で、MiniCalendar と同じ表示月を同期して移動する。
      onViewDateChange?.(baseDate.clone().add(delta, "month"));
    },
    [baseDate, onViewDateChange],
  );

  const handleResetViewMonth = useCallback(() => {
    // 意図: 見出し中央クリックで現在月に戻し、左右移動後に素早くホーム位置へ復帰できるようにする。
    onViewDateChange?.(window.moment());
  }, [onViewDateChange]);

  // 意図: 既に現在月を表示中なら「戻す」操作は無効化し、誤操作感と不要な強調表示を避ける。
  const isViewingCurrentMonth = baseDate.isSame(window.moment(), "month");

  return (
    <PanelSection
      title="年月日別"
      className="mfdi-sidebar-scales mt-2 items-stretch gap-0 pt-2"
      onTitleClick={isViewingCurrentMonth ? undefined : handleResetViewMonth}
    >
      <VStack className="items-stretch gap-1">
        <HStack className="mfdi-scale-navigation justify-end gap-1 px-2">
          <NavButton direction="left" onClick={() => handleMoveViewMonth(-1)} />
          <NavButton direction="right" onClick={() => handleMoveViewMonth(1)} />
          {loading ? (
            <Spinner className="size-3 animate-spin text-[var(--text-faint)] [animation-duration:0.8s]" />
          ) : null}
        </HStack>
        <VStack className="mfdi-scale-list-unified items-stretch gap-0">
          {(["year", "quarter", "month"] as const).map((scaleGranularity) => {
            const key = buildScaleKey(baseDate, scaleGranularity);
            const counts = countsMap[key];
            const hasActivity =
              counts && (counts.posts > 0 || counts.tasks > 0);
            const isSelected = granularity === scaleGranularity;

            return (
              <SidebarTextButton
                key={scaleGranularity}
                isSelected={isSelected}
                isMuted={!hasActivity}
                className={cn(
                  `mfdi-scale-item mfdi-scale-item-${scaleGranularity}`,
                  isSelected && "is-selected",
                )}
                onClick={() => {
                  if (isSelected) {
                    handleClickHome();
                  } else {
                    setGranularity(scaleGranularity);
                    setDateFilter("today");
                    setDate(baseDate.clone());
                  }
                }}
              >
                <HStack className="gap-0 justify-between w-full">
                  <Text as="span">
                    {formatScaleLabel(baseDate, scaleGranularity)}
                  </Text>
                  {renderCountBadge(counts)}
                </HStack>
              </SidebarTextButton>
            );
          })}

          {weeks.map((w) => {
            const isSelected =
              granularity === "week" && date.isSame(w, "isoWeek");
            const counts = countsMap[buildScaleKey(w, "week")];
            const hasActivity =
              counts && (counts.posts > 0 || counts.tasks > 0);

            return (
              <SidebarTextButton
                key={w.format("YYYY-WW")}
                isSelected={isSelected}
                isMuted={!hasActivity}
                className={cn(
                  "mfdi-scale-item mfdi-scale-item-week",
                  isSelected && "is-selected",
                )}
                onClick={() => {
                  if (isSelected) {
                    handleClickHome();
                  } else {
                    setGranularity("week");
                    setDateFilter("today");
                    const targetDay = w.isBefore(monthStart)
                      ? monthStart.clone()
                      : w.clone();
                    setDate(targetDay);
                  }
                }}
              >
                <HStack className="gap-0 justify-between w-full">
                  <Text as="span">W{w.isoWeek()}</Text>
                  {renderCountBadge(counts)}
                </HStack>
              </SidebarTextButton>
            );
          })}
        </VStack>
      </VStack>
    </PanelSection>
  );
};
