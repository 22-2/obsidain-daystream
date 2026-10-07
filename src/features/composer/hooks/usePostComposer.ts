import { useCallback } from "react";
import { useEditorRefs } from "src/features/composer/context/EditorRefsContext";
import { useEditorStore } from "src/features/composer/store/editorStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { useShallow } from "zustand/shallow";

/** 常設の投稿エディタへフォーカスを移す。 */
export const usePostComposer = () => {
  const { editingPost } = useEditorStore(
    useShallow((state) => ({
      editingPost: state.editingPost,
    })),
  );
  const { inputRef, scrollContainerRef } = useEditorRefs();

  const { isReadOnly } = useSettingsStore(
    useShallow((state) => ({
      isReadOnly: state.isReadOnly(),
    })),
  );

  const openComposer = useCallback(() => {
    if (isReadOnly) return;
    // 意図: 常設エディタを使うため、投稿導線から一覧全体を置き換えず、
    // エディタを表示位置へ戻して入力へフォーカスする。
    scrollContainerRef.current?.scrollTo({ top: 0 });
    window.setTimeout(() => inputRef.current?.focus());
  }, [inputRef, isReadOnly, scrollContainerRef]);

  return { editingPost, isReadOnly, openComposer };
};
