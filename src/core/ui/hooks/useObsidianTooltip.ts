import { setTooltip } from "obsidian";
import { useCallback } from "react";

/** Attach Obsidian's native hover hint to a rendered element. */
export function useObsidianTooltip(tooltip: string) {
  return useCallback(
    (element: HTMLElement | null) => {
      if (element) setTooltip(element, tooltip);
    },
    [tooltip],
  );
}
