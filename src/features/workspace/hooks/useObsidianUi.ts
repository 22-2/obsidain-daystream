import type { WorkspaceLeaf } from "obsidian";
import { useCallback, useMemo } from "react";
import { useAppContext } from "src/core/ui/context/AppContext";
import {
  openBacklinkPreviewModal,
  type BacklinkPreviewModalOptions,
} from "src/features/posts/modals/BacklinkPreviewModal";
import { DeleteConfirmModal, showDeleteConfirmModal } from "src/features/composer/modals/DeleteConfirmModal";
import { DraftListModal } from "src/features/composer/modals/DraftListModal";
import { showInputModal } from "src/features/composer/modals/InputModal";
import type { MFDIEditorModalOptions } from "src/features/composer/modals/MFDIEditorModal";
import { MFDIEditorModal } from "src/features/composer/modals/MFDIEditorModal";
import { useRequiredAppStore } from "src/features/workspace/store/appStore";
import type { PersistedEditingPost } from "src/features/composer/store/slices/editorSlice";
import type { Post } from "src/core/domain/post";
import type { MFDIEditorViewState } from "src/features/composer/views/MFDIEditorView";
import { VIEW_TYPE_MFDI_EDITOR } from "src/features/composer/views/MFDIEditorView";

type DeleteConfirmArgs = Parameters<typeof showDeleteConfirmModal>[1];
type InputModalArgs = Parameters<typeof showInputModal>[1];

export function useObsidianUi() {
  const { shell } = useAppContext();
  const store = useRequiredAppStore();

  const openPopoutEditorView = useCallback(
    (state: MFDIEditorViewState): boolean => {
      const app = shell.getRawApp();
      // 意図: openPopoutLeaf は Obsidian デスクトップ専用 API のため型定義にない場合がある。
      // unknown 経由でキャストして、存在しない環境（モバイル等）では何もしない。
      const openPopout = (
        app.workspace as unknown as {
          openPopoutLeaf?: () => WorkspaceLeaf;
        }
      ).openPopoutLeaf;
      if (!openPopout) return false;

      const leaf = openPopout.call(app.workspace);
      void leaf.setViewState({
        type: VIEW_TYPE_MFDI_EDITOR,
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
    (args: DeleteConfirmArgs) => showDeleteConfirmModal(shell.getRawApp(), args),
    [shell],
  );

  const confirmDeleteAction = useCallback(
    (onConfirm: () => Promise<void>) => {
      new DeleteConfirmModal(shell.getRawApp(), onConfirm).open();
    },
    [shell],
  );

  const openModalEditor = useCallback(
    (options: MFDIEditorModalOptions) => {
      // Obsidian UI API が raw app を要求する処理はここへ集約して、通常コンポーネントへ漏らさない。
      const modal = new MFDIEditorModal(shell.getRawApp(), options);
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
      const postInfo: PersistedEditingPost = {
        id: post.id,
        path: post.path,
        timestampStr: post.timestamp.toISOString(),
        metadataStr: JSON.stringify(post.metadata),
        noteDateStr: post.noteDate.toISOString(),
        offset: post.startOffset,
        granularity: store.getState().granularity,
      };

      const state: MFDIEditorViewState = {
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
        const postInfo: PersistedEditingPost = {
          id: editingPost.id,
          path: editingPost.path,
          timestampStr: editingPost.timestamp.toISOString(),
          metadataStr: JSON.stringify(editingPost.metadata),
          noteDateStr: editingPost.noteDate.toISOString(),
          offset: editingPost.startOffset,
          granularity: store.getState().granularity,
        };

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
