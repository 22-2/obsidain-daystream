import { useCallback, useRef } from "react";
import type { MFDIEditorModal } from "src/ui/modals/MFDIEditorModal";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { usePosts } from "src/ui/hooks/usePosts";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

/** 投稿入力ダイアログを開き、既存の入力セッションへ接続する。 */
export const usePostComposer = () => {
  const { openModalEditor } = useObsidianUi();
  const { handleSubmit } = usePostActions();
  const { posts } = usePosts();
  const modalRef = useRef<MFDIEditorModal | null>(null);

  const {
    inputSnapshot,
    editingPost,
    syncInputSession,
    cancelEdit,
    canSubmit,
  } = useEditorStore(
    useShallow((state) => ({
      inputSnapshot: state.inputSnapshot,
      editingPost: state.editingPost,
      syncInputSession: state.syncInputSession,
      cancelEdit: state.cancelEdit,
      canSubmit: state.canSubmit,
    })),
  );

  const { isReadOnly } = useSettingsStore(
    useShallow((state) => ({
      isReadOnly: state.isReadOnly(),
    })),
  );

  const openComposer = useCallback(() => {
    if (isReadOnly || modalRef.current) return;

    const editingAtOpen = editingPost;
    const modal = openModalEditor({
      initialContent: inputSnapshot,
      onChange: syncInputSession,
      onClose: (content) => {
        modalRef.current = null;
        if (editingAtOpen) {
          cancelEdit();
          return;
        }
        syncInputSession(content);
      },
      onSubmit: async (content) => {
        syncInputSession(content);
        if (!canSubmit(posts, content)) return false;

        await handleSubmit();
        modalRef.current = null;
        return true;
      },
      canSubmit: (content) => canSubmit(posts, content),
      submitLabel: editingAtOpen ? "更新" : "投稿",
    });
    modalRef.current = modal;
  }, [
    cancelEdit,
    canSubmit,
    editingPost,
    handleSubmit,
    inputSnapshot,
    isReadOnly,
    openModalEditor,
    posts,
    syncInputSession,
  ]);

  return { editingPost, isReadOnly, openComposer };
};
