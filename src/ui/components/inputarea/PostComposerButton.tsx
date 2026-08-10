import { useCallback, useEffect, useRef } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { FloatingButton } from "src/ui/components/primitives/FloatingButton";
import { cn } from "src/ui/components/primitives/utils";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { usePosts } from "src/ui/hooks/usePosts";
import type { MFDIEditorModal } from "src/ui/modals/MFDIEditorModal";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

/**
 * タイムライン上の入力欄を常設せず、必要なときだけ投稿ダイアログを開く導線。
 * 入力内容は既存の editor store と同期するため、閉じても下書きを失わない。
 */
export const PostComposerButton: React.FC = () => {
  const { openModalEditor } = useObsidianUi();
  const { handleSubmit } = usePostActions();
  const { posts } = usePosts();
  const modalRef = useRef<MFDIEditorModal | null>(null);
  const openedEditingIdRef = useRef<string | null>(null);

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

  const { isReadOnly, rightPanelOpen } = useSettingsStore(
    useShallow((state) => ({
      isReadOnly: state.isReadOnly(),
      rightPanelOpen: state.rightPanelOpen ?? state.sidebarOpen,
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

  useEffect(() => {
    if (!editingPost) {
      openedEditingIdRef.current = null;
      return;
    }
    if (openedEditingIdRef.current === editingPost.id) return;
    openedEditingIdRef.current = editingPost.id;
    openComposer();
  }, [editingPost, openComposer]);

  return (
    <FloatingButton
      ariaLabel="新しい投稿"
      className={cn(
        "mfdi-compose-button fixed bottom-8",
        rightPanelOpen ? "right-[calc(276px+2rem)]" : "right-8",
      )}
      onClick={openComposer}
      visible={!isReadOnly}
    >
      <ObsidianIcon
        name="plus"
        className="text-[var(--text-on-accent)] hover:text-[var(--text-on-accent)]"
        boxSize="1.35em"
      />
    </FloatingButton>
  );
};
