import type { FC } from "react";
import { IconButton } from "src/core/ui/components/common/IconButton";
import { cn } from "src/core/ui/components/primitives/utils";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { isHomeViewState } from "src/features/workspace/utils/view-state";
import { useShallow } from "zustand/shallow";

/** 日付ナビゲーションの左端から表示状態を初期化するホームボタン。 */
export const StatusBarHome: FC = () => {
  const {
    activeTag,
    asTask,
    date,
    dateFilter,
    displayMode,
    granularity,
    handleClickHome,
    mainView,
    searchInputOpen,
    searchQuery,
    threadFocusRootId,
    timeFilter,
  } = useSettingsStore(
    useShallow((state) => ({
      activeTag: state.activeTag,
      asTask: state.asTask,
      date: state.date,
      dateFilter: state.dateFilter,
      displayMode: state.displayMode,
      granularity: state.granularity,
      handleClickHome: state.handleClickHome,
      mainView: state.mainView,
      searchInputOpen: state.searchInputOpen,
      searchQuery: state.searchQuery,
      threadFocusRootId: state.threadFocusRootId,
      timeFilter: state.timeFilter,
    })),
  );

  const isViewDefault = isHomeViewState({
    date,
    mainView,
    displayMode,
    granularity,
    dateFilter,
    timeFilter,
    asTask,
    activeTag,
    threadFocusRootId,
    searchQuery,
    searchInputOpen,
  });

  return (
    <IconButton
      name="home"
      tooltip="ホーム"
      size="16px"
      onActivate={handleClickHome}
      className={cn(
        "daystream-home-action size-6 shrink-0 p-0",
        !isViewDefault && "daystream-home-action--active",
      )}
    />
  );
};
