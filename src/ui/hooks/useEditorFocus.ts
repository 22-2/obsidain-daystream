import { useEffect, type RefObject } from "react";

/** 編集開始・対象切り替え・再表示時のフォーカスを各入力画面で揃える。 */
export function useEditorFocus(
  inputRef: RefObject<{ focus: () => void } | null>,
  editingTarget: unknown,
  enabled = true,
  scrollContainerRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!enabled) return;
    // 意図: エディタの生成と本文同期が終わってからフォーカスし、
    // 閉じた画面の予約処理が別の入力欄へフォーカスを奪わないよう解除する。
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      // 意図: フォーカスだけでは一覧のスクロール位置が戻らないため、
      // 常設エディタがある先頭へ移動して編集欄も見える状態にする。
      scrollContainerRef?.current?.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => window.clearTimeout(timer);
  }, [inputRef, editingTarget, enabled, scrollContainerRef]);
}
