import { ObsidianIcon } from "src/core/ui/components/common/ObsidianIcon";
import { cn } from "src/core/ui/components/primitives/utils";
import { MAIN_VIEW } from "src/features/workspace/config/constants";
import type { MainView } from "src/features/workspace/types";
import type { MFDINoteMode } from "src/features/workspace/views/state";

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
    value: MAIN_VIEW.TASKS,
    label: "タスク",
    icon: "list-checks",
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
  noteMode: MFDINoteMode;
  onChange: (value: MainView) => void;
}> = ({ value, noteMode, onChange }) => {
  const tabs = TABS.filter((tab) => noteMode === "periodic" || !tab.periodicOnly);

  return (
    <nav className="mfdi-main-view-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
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
