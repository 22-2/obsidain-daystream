import { useEffect, type RefObject } from "react";
import { getSidebarAutoToggleState } from "src/features/workspace/utils/sidebarAutoToggle";

export function useSidebarAutoToggle(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  setSidebarOpen: (open: boolean) => void,
): void {
  useEffect(() => {
    if (!containerRef.current) return;
    let previousWidth: number | null = null;
    const observer = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const nextWidth = entries[0].contentRect.width;
      // 意図: 非表示タブの幅 0 はリサイズと扱わず、直前の表示幅と手動の開閉状態を保つ。
      if (nextWidth <= 0) return;
      // 意図: 初回表示や設定切替は幅の基準だけを記録し、復元済みの左右の状態を上書きしない。
      if (previousWidth === null) {
        previousWidth = nextWidth;
        return;
      }
      const nextSidebarOpen = getSidebarAutoToggleState({
        enabled,
        previousWidth,
        nextWidth,
      });
      previousWidth = nextWidth;
      if (nextSidebarOpen !== null) {
        setSidebarOpen(nextSidebarOpen);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, enabled, setSidebarOpen]);
}
