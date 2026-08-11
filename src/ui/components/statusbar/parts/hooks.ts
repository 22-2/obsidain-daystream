import { Menu } from "obsidian";
import { useEffect, useMemo, useState } from "react";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { addGranularityMenuItems } from "src/ui/menus/granularityMenu";
import { addPeriodMenuItems } from "src/ui/menus/periodMenu";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { DisplayMode, Post } from "src/ui/types";
import { isVisible } from "src/ui/utils/post-metadata";
import { countVisibleRootPosts } from "src/ui/utils/thread-utils";
import { isTimelineView } from "src/ui/utils/view-mode";
import { getMFDIViewCapabilities, type MFDINoteMode } from "src/ui/view/state";
import useSWR from "swr";
import { useShallow } from "zustand/shallow";

export function useDbTotalCount(activeTopic: string | undefined) {
  const db = useMFDIDB();
  const { data } = useSWR(db ? ["dbTotalCount", activeTopic] : null, () =>
    db!.countMemos(activeTopic),
  );
  return data;
}

export function useTotalCount(
  displayMode: DisplayMode,
  dbTotalCount: number | undefined,
  posts: Post[],
) {
  return useMemo(() => {
    if (isTimelineView(displayMode)) {
      return dbTotalCount;
    }
    return countVisibleRootPosts(posts.filter((p) => isVisible(p.metadata)));
  }, [posts, displayMode, dbTotalCount]);
}

export const useGranularityMenu = () => {
  const { granularity, setGranularity } = useSettingsStore(
    useShallow((s) => ({
      granularity: s.granularity,
      setGranularity: s.setGranularity,
    })),
  );

  return (e: React.MouseEvent) => {
    if (!setGranularity) return;
    e.preventDefault();
    const menu = new Menu();
    addGranularityMenuItems(menu, granularity, (g) => setGranularity(g));
    menu.showAtMouseEvent(e.nativeEvent);
  };
};

export const useFilterMenu = () => {
  const state = useSettingsStore(
    useShallow((s) => ({
      granularity: s.granularity,
      date: s.date,
      timeFilter: s.timeFilter,
      dateFilter: s.dateFilter,
      displayMode: s.displayMode,
      asTask: s.asTask,
      activeTopic: s.activeTopic,
      setTimeFilter: s.setTimeFilter,
      setDateFilter: s.setDateFilter,
    })),
  );
  const { setTimeFilter, setDateFilter } = state;

  return (e: React.MouseEvent) => {
    e.preventDefault();
    const menu = new Menu();
    addPeriodMenuItems(menu, state, {
      onChangeTimeFilter: (f) => setTimeFilter?.(f),
      onChangeDateFilter: (f) => setDateFilter?.(f),
    });
    menu.showAtMouseEvent(e.nativeEvent);
  };
};

export function useSettings() {
  return useSettingsStore(
    useShallow((s) => ({
      activeTopic: s.activeTopic,
      asTask: s.asTask,
      date: s.date,
      dateFilter: s.dateFilter,
      displayMode: s.displayMode,
      file: s.file,
      granularity: s.granularity,
      threadFocusRootId: s.threadFocusRootId,
      timeFilter: s.timeFilter,
      viewNoteMode: s.viewNoteMode,
    })),
  );
}

export function useCurrentTime(enabled: boolean) {
  const [currentTime, setCurrentTime] = useState(() => window.moment());

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(() => {
      setCurrentTime(window.moment());
    }, 30000);

    return () => window.clearInterval(timer);
  }, [enabled]);

  return currentTime;
}

export function useCapabilities(viewNoteMode: MFDINoteMode) {
  return useMemo(() => getMFDIViewCapabilities({ noteMode: viewNoteMode }), [viewNoteMode]);
}
