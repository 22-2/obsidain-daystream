import type { Menu } from "obsidian";
import {
  GRANULARITIES,
  GRANULARITY_CONFIG,
  type Granularity,
} from "src/features/workspace/config/granularity-config";

export function addGranularityMenuItems(
  menu: Menu,
  currentGranularity: Granularity,
  onChangeGranularity?: (g: Granularity) => void,
) {
  // --- 表示スケール ---
  menu.addSeparator();
  menu.addItem((item) => {
    item.setTitle("表示スケール").setIcon("calendar").setDisabled(true);
  });
  for (const g of GRANULARITIES) {
    menu.addItem((item) => {
      item
        .setTitle(GRANULARITY_CONFIG[g].menuLabel)
        .setChecked(currentGranularity === g)
        .onClick(() => {
          onChangeGranularity?.(g);
        });
    });
  }
}
