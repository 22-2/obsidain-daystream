import { useEffect } from "react";
import type { MFDIView } from "src/ui/view/MFDIView";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

/** Mirrors store-owned view settings into the Obsidian view state. */
export function useMFDIViewStateSync(view: MFDIView | null): void {
  const {
    granularity,
    activeTopic,
    asTask,
    threadOnly,
    timeFilter,
    dateFilter,
    displayMode,
    searchQuery,
    fixedSessionNumber,
  } = useSettingsStore(
    useShallow((state) => ({
      granularity: state.granularity,
      activeTopic: state.activeTopic,
      asTask: state.asTask,
      threadOnly: state.threadOnly,
      timeFilter: state.timeFilter,
      dateFilter: state.dateFilter,
      displayMode: state.displayMode,
      searchQuery: state.searchQuery,
      fixedSessionNumber: state.fixedSessionNumber,
    })),
  );

  useEffect(() => {
    if (!view) return;

    view.setStatePartial({
      granularity,
      activeTopic,
      asTask,
      threadOnly,
      timeFilter,
      dateFilter,
      displayMode,
      searchQuery,
      fixedSessionNumber,
    });
  }, [
    view,
    granularity,
    activeTopic,
    asTask,
    threadOnly,
    timeFilter,
    dateFilter,
    displayMode,
    searchQuery,
    fixedSessionNumber,
  ]);
}
