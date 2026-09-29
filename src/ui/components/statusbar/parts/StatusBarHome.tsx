import type { FC } from "react";
import { IconButton } from "src/ui/components/common/IconButton";
import { cn } from "src/ui/components/primitives/utils";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isDefaultViewState } from "src/ui/utils/view-state";
import { useShallow } from "zustand/shallow";

/** 日付ナビゲーションの左端から表示状態を初期化するホームボタン。 */
export const StatusBarHome: FC = () => {
  const {
    activeTag,
    asTask,
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

  const isViewDefault = isDefaultViewState({
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
      ariaLabel="ホーム"
      size="16px"
      onActivate={handleClickHome}
      className={cn(
        "mfdi-home-action size-6 shrink-0 p-0",
        !isViewDefault && "mfdi-home-action--active",
      )}
    />
  );
};
