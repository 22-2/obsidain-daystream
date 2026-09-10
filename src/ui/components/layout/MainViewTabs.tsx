import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { cn } from "src/ui/components/primitives/utils";
import { MAIN_VIEW } from "src/ui/config/consntants";
import type { MainView } from "src/ui/types";
import type { MFDINoteMode } from "src/ui/view/state";

const TABS: Array<{
  value: MainView;
  label: string;
  icon: string;
  periodicOnly?: boolean;
}> = [
  { value: MAIN_VIEW.DATE, label: "日付", icon: "calendar-days", periodicOnly: true },
  { value: MAIN_VIEW.TIMELINE, label: "タイムライン", icon: "list" },
  { value: MAIN_VIEW.SEARCH, label: "検索", icon: "search" },
  { value: MAIN_VIEW.TASKS, label: "タスク", icon: "list-checks", periodicOnly: true },
  { value: MAIN_VIEW.INSIGHTS, label: "インサイト", icon: "book-open", periodicOnly: true },
];

export const MainViewTabs: React.FC<{
  value: MainView;
  noteMode: MFDINoteMode;
  onChange: (value: MainView) => void;
  onHome: () => void;
}> = ({ value, noteMode, onChange, onHome }) => {
  const tabs = TABS.filter((tab) => noteMode === "periodic" || !tab.periodicOnly);

  return (
    <nav className="mfdi-main-view-tabs" aria-label="メインビュー" role="tablist">
      <button
        type="button"
        className="mfdi-main-view-tabs__tab mfdi-main-view-tabs__home"
        aria-label="ホーム"
        title="ホーム"
        onClick={onHome}
      >
        <ObsidianIcon name="home" size="16px" className="pointer-events-none size-4 p-0" />
      </button>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          aria-label={tab.label}
          title={tab.label}
          className={cn("mfdi-main-view-tabs__tab", value === tab.value && "is-active")}
          onClick={() => onChange(tab.value)}
        >
          <ObsidianIcon name={tab.icon} size="16px" className="pointer-events-none size-4 p-0" />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};
