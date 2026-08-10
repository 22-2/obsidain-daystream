import type { FC } from "react";
import { IconButton } from "src/ui/components/common/IconButton";
import { cn } from "src/ui/components/primitives/utils";
import { isDefaultViewState } from "src/ui/utils/view-state";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

/** 表示状態を初期状態へ戻すホームボタン。 */
export const StatusBarHome: FC = () => {
  const {
    activeTag,
    asTask,
    dateFilter,
    displayMode,
    granularity,
    handleClickHome,
    searchInputOpen,
    searchQuery,
    threadFocusRootId,
    timeFilter,
  } = useSettingsStore(
    useShallow((s) => ({
      activeTag: s.activeTag,
      asTask: s.asTask,
      dateFilter: s.dateFilter,
      displayMode: s.displayMode,
      granularity: s.granularity,
      handleClickHome: s.handleClickHome,
      searchInputOpen: s.searchInputOpen,
      searchQuery: s.searchQuery,
      threadFocusRootId: s.threadFocusRootId,
      timeFilter: s.timeFilter,
    })),
  );

  const isViewDefault = isDefaultViewState({
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
      size="md"
      onActivate={handleClickHome}
      className={cn(
        "absolute left-1 top-1 z-10",
        !isViewDefault &&
          "text-[var(--text-accent)] hover:text-[var(--text-normal)]",
      )}
    />
  );
};
