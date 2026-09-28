import { useEffect, useState } from "react";

const CSS_CHECK_TIMEOUT_MS = 2000;

function hasExpectedScrollerStyle(viewRoot: HTMLElement): boolean {
  const viewWindow = viewRoot.ownerDocument.defaultView;
  if (!viewWindow) {
    return false;
  }

  const cssLoadedMarker = viewWindow
    .getComputedStyle(viewRoot)
    .getPropertyValue("--mfdi-css-loaded")
    .trim();

  return cssLoadedMarker === "1";
}

export function useCSSLoaded(viewRoot: HTMLElement) {
  const [isCSSLoaded, setIsCSSLoaded] = useState<boolean>(() =>
    hasExpectedScrollerStyle(viewRoot),
  );

  useEffect(() => {
    if (isCSSLoaded) {
      return;
    }

    // 意図: 別ウィンドウでは CSS 適用通知が届かないことがある。
    // ビュー固有の document で確認しつつ、通知失敗で UI が永久に隠れないよう期限を設ける。
    if (hasExpectedScrollerStyle(viewRoot)) {
      setIsCSSLoaded(true);
      return;
    }
    const deadline = viewRoot.ownerDocument.defaultView?.setTimeout(() => {
      setIsCSSLoaded(true);
    }, CSS_CHECK_TIMEOUT_MS);
    let raf = 0;
    const handleFrame = () => {
      if (hasExpectedScrollerStyle(viewRoot)) {
        setIsCSSLoaded(true);
        return;
      }
      raf = viewRoot.ownerDocument.defaultView?.requestAnimationFrame(handleFrame) ?? 0;
    };
    raf = viewRoot.ownerDocument.defaultView?.requestAnimationFrame(handleFrame) ?? 0;
    return () => {
      if (deadline !== undefined) viewRoot.ownerDocument.defaultView?.clearTimeout(deadline);
      viewRoot.ownerDocument.defaultView?.cancelAnimationFrame(raf);
    };
  }, [isCSSLoaded, viewRoot]);

  return isCSSLoaded;
}
