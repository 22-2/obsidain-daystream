import { useEffect } from "react";
import type { MFDIView } from "src/features/workspace/views/MFDIView";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
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
    mainView,
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
      mainView: state.mainView,
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
      // 意図: 上部タブは vault 全体の設定ではなく、この Obsidian view の workspace state として保存する。
      mainView,
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
    mainView,
  ]);
}
