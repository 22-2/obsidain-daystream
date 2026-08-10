import type { Menu } from "obsidian";
import {
  DATE_FILTER_OPTIONS,
  TIME_FILTER_OPTIONS,
} from "src/ui/config/filter-config";
import type {
  DateFilter,
  DisplayMode,
  Granularity,
  TimeFilter,
} from "src/ui/types";
import { isTimelineView } from "src/ui/utils/view-mode";

export function addPeriodMenuItems(
  menu: Menu,
  state: {
    granularity: Granularity;
    asTask: boolean;
    timeFilter: TimeFilter;
    dateFilter: DateFilter;
    displayMode: DisplayMode;
  },
  callbacks: {
    onChangeTimeFilter?: (filter: TimeFilter) => void;
    onChangeDateFilter?: (filter: DateFilter) => void;
  },
) {
  const showFilter =
    state.granularity === "day" &&
    !state.asTask &&
    !isTimelineView(state.displayMode);

  // --- 表示期間 ---
  menu.addSeparator();
  menu.addItem((item) => {
    item.setTitle("表示期間").setIcon("calendar").setDisabled(true);
  });
  for (const f of DATE_FILTER_OPTIONS) {
    menu.addItem((item) => {
      const isChecked = showFilter
        ? state.dateFilter === f.id
        : f.id === "today";
      item
        .setTitle(f.label)
        .setChecked(isChecked)
        .setDisabled(!showFilter)
        .onClick(() => {
          callbacks.onChangeDateFilter?.(f.id);
        });
    });
  }

  // date と time は同じ period 条件で効くので、同一メニュー内で同じ enable 条件に揃える。
  menu.addSeparator();
  menu.addItem((item) => {
    item.setTitle("表示期間（時間）").setIcon("clock").setDisabled(true);
  });
  for (const f of TIME_FILTER_OPTIONS) {
    menu.addItem((item) => {
      const isChecked = showFilter ? state.timeFilter === f.id : f.id === "all";
      item
        .setTitle(f.label)
        .setChecked(isChecked)
        .setDisabled(!showFilter)
        .onClick(() => {
          callbacks.onChangeTimeFilter?.(f.id);
        });
    });
  }
}
