import { useCallback } from "react";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

/** 投稿入力画面を開く。 */
export const usePostComposer = () => {
  const { editingPost, openComposer: openComposerView } = useEditorStore(
    useShallow((state) => ({
      editingPost: state.editingPost,
      openComposer: state.openComposer,
    })),
  );

  const { isReadOnly } = useSettingsStore(
    useShallow((state) => ({
      isReadOnly: state.isReadOnly(),
    })),
  );

  const openComposer = useCallback(() => {
    if (isReadOnly) return;
    openComposerView();
  }, [isReadOnly, openComposerView]);

  return { editingPost, isReadOnly, openComposer };
};
