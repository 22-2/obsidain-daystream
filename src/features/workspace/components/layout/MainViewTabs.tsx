import type React from "react";
import { ObsidianIcon } from "src/core/ui/components/common/ObsidianIcon";
import { cn } from "src/core/ui/components/primitives/utils";
import { MAIN_VIEW } from "src/features/workspace/config/constants";
import type { MainView } from "src/features/workspace/types";
import type { DSTRNoteMode } from "src/features/workspace/views/state";

const TABS: Array<{
  value: MainView;
  label: string;
  icon: string;
  periodicOnly?: boolean;
}> = [
  { value: MAIN_VIEW.TIMELINE, label: "タイムライン", icon: "list" },
  {
    value: MAIN_VIEW.DATE,
    label: "日付",
    icon: "calendar-days",
    periodicOnly: true,
  },
  {
    value: MAIN_VIEW.INSIGHTS,
    label: "インサイト",
    icon: "book-open",
    periodicOnly: true,
  },
];

export const MainViewTabs: React.FC<{
  value: MainView;
  noteMode: DSTRNoteMode;
  /** 今開いているのがボードかどうか。ボードのときは「ボード」タブが選択される。 */
  isBoard?: boolean;
  onChange: (value: MainView) => void;
  onSelectBoards?: () => void;
  onBoardsContextMenu?: React.MouseEventHandler<HTMLButtonElement>;
}> = ({ value, noteMode, isBoard = false, onChange, onSelectBoards, onBoardsContextMenu }) => {
  // 意図: ボードは日付に依存しないが、ほかのタブへ戻れるよう periodic のタブも並べる。
  // ボードでない固定ノートは従来どおりタイムラインだけを出す。
  const showAllTabs = noteMode === "periodic" || isBoard;
  const tabs = TABS.filter((tab) => showAllTabs || !tab.periodicOnly);

  return (
    <nav className="dstr-main-view-tabs" role="tablist">
      {tabs.map((tab) => {
        const selected = !isBoard && value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn("dstr-main-view-tabs__tab", selected && "is-active")}
            onClick={() => onChange(tab.value)}
          >
            <ObsidianIcon name={tab.icon} size="16px" className="pointer-events-none size-4 p-0" />
            <span>{tab.label}</span>
          </button>
        );
      })}
      {showAllTabs && onSelectBoards && (
        <button
          type="button"
          role="tab"
          aria-selected={isBoard}
          className={cn("dstr-main-view-tabs__tab", isBoard && "is-active")}
          onClick={() => {
            if (!isBoard) onSelectBoards();
          }}
          onContextMenu={onBoardsContextMenu}
        >
          <ObsidianIcon
            name="sticky-note"
            size="16px"
            className="pointer-events-none size-4 p-0"
          />
          <span>ボード</span>
        </button>
      )}
    </nav>
  );
};
