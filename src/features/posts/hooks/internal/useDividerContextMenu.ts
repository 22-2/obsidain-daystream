import { Menu } from "obsidian";
import type { MouseEvent } from "react";
import { useCallback } from "react";

type UseDividerContextMenuInput = {
  canCollapseDividers: boolean;
  areAllVisibleDividersCollapsed: boolean;
  areAllVisibleDividersExpanded: boolean;
  hasVisibleDividers: boolean;
  collapseAll: () => void;
  expandAll: () => void;
};

export function useDividerContextMenu({
  canCollapseDividers,
  areAllVisibleDividersCollapsed,
  areAllVisibleDividersExpanded,
  hasVisibleDividers,
  collapseAll,
  expandAll,
}: UseDividerContextMenuInput) {
  const showDividerContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const menu = new Menu();

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

      menu.showAtMouseEvent(event.nativeEvent);
    },
    [
      canCollapseDividers,
      areAllVisibleDividersCollapsed,
      areAllVisibleDividersExpanded,
      hasVisibleDividers,
      collapseAll,
      expandAll,
    ],
  );

  return { showDividerContextMenu };
}
