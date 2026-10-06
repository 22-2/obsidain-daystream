import { useEffect, type RefObject } from "react";

/** 編集開始・対象切り替え・再表示時のフォーカスを各入力画面で揃える。 */
export function useEditorFocus(
  inputRef: RefObject<{ focus: () => void } | null>,
  editingTarget: unknown,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    // 意図: エディタの生成と本文同期が終わってからフォーカスし、
    // 閉じた画面の予約処理が別の入力欄へフォーカスを奪わないよう解除する。
    const timer = window.setTimeout(() => inputRef.current?.focus());
    return () => window.clearTimeout(timer);
  }, [inputRef, editingTarget, enabled]);
}
