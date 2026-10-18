import { useCallback, useMemo } from "react";
import { useAppContext } from "src/core/ui/context/AppContext";
import {
  openBacklinkPreviewModal,
  type BacklinkPreviewModalOptions,
} from "src/features/posts/modals/BacklinkPreviewModal";
import {
  DeleteConfirmModal,
  showDeleteConfirmModal,
} from "src/features/composer/modals/DeleteConfirmModal";
import { DraftListModal } from "src/features/composer/modals/DraftListModal";
import { showInputModal } from "src/features/composer/modals/InputModal";
import type { DSTREditorModalOptions } from "src/features/composer/modals/DSTREditorModal";
import { DSTREditorModal } from "src/features/composer/modals/DSTREditorModal";
import { useRequiredAppStore } from "src/features/workspace/store/appStore";
import { toPersistedEditingPost } from "src/features/composer/store/slices/editorPersistence";
import type { Post } from "src/core/domain/post";
import type { DSTREditorViewState } from "src/features/composer/views/DSTREditorView";
import { VIEW_TYPE_DSTR_EDITOR } from "src/features/composer/views/DSTREditorView";

type DeleteConfirmArgs = Parameters<typeof showDeleteConfirmModal>[1];
type InputModalArgs = Parameters<typeof showInputModal>[1];

export function useObsidianUi() {
  const { shell } = useAppContext();
  const store = useRequiredAppStore();

  const openPopoutEditorView = useCallback(
    (state: DSTREditorViewState): boolean => {
      const app = shell.getRawApp();
      // 意図: openPopoutLeaf は Obsidian デスクトップ専用 API のため、存在しない環境（モバイル等）では何もしない。
      if (typeof app.workspace.openPopoutLeaf !== "function") return false;

      const leaf = app.workspace.openPopoutLeaf();
      void leaf.setViewState({
        type: VIEW_TYPE_DSTR_EDITOR,
        active: true,
        state,
      });
      return true;
    },
    [shell],
  );

  const openDraftList = useCallback(() => {
    new DraftListModal(shell.getRawApp(), store).open();
  }, [shell, store]);

  const showTextInput = useCallback(
    (args: InputModalArgs) => showInputModal(shell.getRawApp(), args),
    [shell],
  );

  const confirmDelete = useCallback(
    (args: DeleteConfirmArgs) =>
      showDeleteConfirmModal(shell.getRawApp(), args),
    [shell],
  );

  const confirmDeleteAction = useCallback(
    (onConfirm: () => Promise<void>) => {
      new DeleteConfirmModal(shell.getRawApp(), onConfirm).open();
    },
    [shell],
  );

  const openModalEditor = useCallback(
    (options: DSTREditorModalOptions) => {
      // Obsidian UI API が raw app を要求する処理はここへ集約して、通常コンポーネントへ漏らさない。
      const modal = new DSTREditorModal(shell.getRawApp(), options);
      modal.open();
      return modal;
    },
    [shell],
  );

  const openBacklinkPreview = useCallback(
    (options: BacklinkPreviewModalOptions) => {
      // Obsidian の Modal 生成は raw app 依存なので、呼び出し側には options だけを渡させる。
      return openBacklinkPreviewModal(shell.getRawApp(), options);
    },
    [shell],
  );

  const openEditorInNewWindow = useCallback(
    (post: Post) => {
      const draftMetadata = { ...post.metadata };
      const { date, granularity } = store.getState();
      const postInfo = toPersistedEditingPost(post, { date, granularity });

      const state: DSTREditorViewState = {
        postInfo,
        message: post.message,
        draftMetadata,
        draftMetadataBase: draftMetadata,
      };
      openPopoutEditorView(state);
    },
    [store, openPopoutEditorView],
  );

  const openInputInNewWindow = useCallback(
    (
      message: string,
      editingPost: Post | null,
      draftMetadata: Record<string, string>,
      draftMetadataBase: Record<string, string>,
    ): boolean => {
      if (editingPost) {
        // 意図: message は編集途中の入力、postInfo.message は元の本文として別々に渡す。
        const { date, granularity } = store.getState();
        const postInfo = toPersistedEditingPost(editingPost, { date, granularity });

        return openPopoutEditorView({
          postInfo,
          message,
          draftMetadata,
          draftMetadataBase,
        });
      }

      return openPopoutEditorView({
        message,
        draftMetadata,
        draftMetadataBase,
      });
    },
    [store, openPopoutEditorView],
  );

  return useMemo(
    () => ({
      openDraftList,
      showTextInput,
      confirmDelete,
      confirmDeleteAction,
      openModalEditor,
      openBacklinkPreview,
      openEditorInNewWindow,
      openInputInNewWindow,
    }),
    [
      openDraftList,
      showTextInput,
      confirmDelete,
      confirmDeleteAction,
      openModalEditor,
      openBacklinkPreview,
      openEditorInNewWindow,
      openInputInNewWindow,
    ],
  );
}
