export interface SidebarAutoToggleParams {
  enabled: boolean;
  previousWidth: number;
  nextWidth: number;
}

export function getSidebarAutoToggleState({
  enabled,
  previousWidth,
  nextWidth,
}: SidebarAutoToggleParams): boolean | null {
  if (!enabled) {
    return null;
  }

  // 意図: 閾値を跨いだ瞬間だけ自動開閉し、通常時の手動トグル状態は維持する。
  if (nextWidth <= 1100 && previousWidth > 1100) {
    return false;
  }

  if (nextWidth > 1400 && previousWidth <= 1400) {
    return true;
  }

  return null;
}
