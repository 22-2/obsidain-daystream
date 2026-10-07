import { Menu } from "obsidian";
import { useCallback } from "react";
import type { MomentLike } from "src/features/workspace/types";

type DividerContextMenuCapabilities = {
  supportsDateNavigation: boolean;
};

type UseDividerContextMenuInput = {
  canCollapseDividers: boolean;
  capabilities: DividerContextMenuCapabilities;
  areAllVisibleDividersCollapsed: boolean;
  areAllVisibleDividersExpanded: boolean;
  hasVisibleDividers: boolean;
  handleClickDateDivider: (date: MomentLike) => void;
  openDailyNoteSourceForDate: (date: MomentLike) => Promise<void>;
  toggleCollapsedGroup: (groupKey: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
};

export function useDividerContextMenu({
  canCollapseDividers,
  capabilities,
  areAllVisibleDividersCollapsed,
  areAllVisibleDividersExpanded,
  hasVisibleDividers,
  handleClickDateDivider,
  openDailyNoteSourceForDate,
  toggleCollapsedGroup,
  collapseAll,
  expandAll,
}: UseDividerContextMenuInput) {
  const showDividerContextMenu = useCallback(
    (
      event: React.MouseEvent,
      params?: {
        date?: MomentLike;
        groupKey?: string;
        collapsed?: boolean;
      },
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const menu = new Menu();

      if (params?.date) {
        const targetDate = params.date;
        menu.addItem((item) =>
          item
            .setTitle("この日にフォーカス")
            .setIcon("calendar-range")
            .setDisabled(!capabilities.supportsDateNavigation)
            .onClick(() => {
              handleClickDateDivider(targetDate);
            }),
        );

        menu.addItem((item) =>
          item
            .setTitle("この日のソースを開く")
            .setIcon("code-xml")
            .setDisabled(!capabilities.supportsDateNavigation)
            .onClick(() => {
              void openDailyNoteSourceForDate(targetDate);
            }),
        );

        if (params.groupKey) {
          const targetGroupKey = params.groupKey;
          menu.addItem((item) =>
            item
              .setTitle(params.collapsed ? "このdividerを展開する" : "このdividerを折りたたむ")
              .setIcon(params.collapsed ? "rows" : "chevron-down")
              .setDisabled(!canCollapseDividers)
              .onClick(() => {
                toggleCollapsedGroup(targetGroupKey);
              }),
          );
        }

        menu.addSeparator();
      }

      menu.addItem((item) =>
        item
          .setTitle("表示中のdividerをすべて折りたたむ")
          .setIcon("chevrons-up-down")
          .setDisabled(
            !canCollapseDividers || !hasVisibleDividers || areAllVisibleDividersCollapsed,
          )
          .onClick(collapseAll),
      );

      menu.addItem((item) =>
        item
          .setTitle("表示中のdividerをすべて展開する")
          .setIcon("rows")
          .setDisabled(!canCollapseDividers || !hasVisibleDividers || areAllVisibleDividersExpanded)
          .onClick(expandAll),
      );

      menu.showAtMouseEvent(event as unknown as MouseEvent);
    },
    [
      canCollapseDividers,
      capabilities.supportsDateNavigation,
      areAllVisibleDividersCollapsed,
      areAllVisibleDividersExpanded,
      hasVisibleDividers,
      handleClickDateDivider,
      openDailyNoteSourceForDate,
      toggleCollapsedGroup,
      collapseAll,
      expandAll,
    ],
  );

  return { showDividerContextMenu };
}
