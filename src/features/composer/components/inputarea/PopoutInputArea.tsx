import type { FC } from "react";
import { memo, useCallback, useEffect } from "react";
import { ObsidianLiveEditor } from "src/features/composer/components/editor/ObsidianLiveEditor";
import { Flex } from "src/core/ui/components/primitives";
import { PLACEHOLDER_TEXT, STORAGE_KEYS } from "src/features/workspace/config/constants";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useObsidianComponent } from "src/core/ui/context/ComponentContext";
import { useEditorRefs } from "src/features/composer/context/EditorRefsContext";
import { useEditorFocus } from "src/features/composer/hooks/useEditorFocus";
import { usePostActions } from "src/features/posts/hooks/internal/usePostActions";
import { usePosts } from "src/features/posts/hooks/usePosts";
import { DiscardConfirmModal } from "src/features/composer/modals/DiscardConfirmModal";
import { useEditorStore } from "src/features/composer/store/editorStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { DaystreamEditorView } from "src/features/composer/views/DaystreamEditorView";
import { useShallow } from "zustand/shallow";

/**
 * ポップアウトウィンドウ専用の入力エリア。
 * InputAreaControl（縮小・拡大・ナビゲーション）を持たず、エディタを全画面表示する。
 * 変更がある場合のキャンセルは DiscardConfirmModal で確認してから破棄する。
 * 投稿/更新後はウィンドウを閉じる。
 */
export const PopoutInputArea: FC = memo(() => {
  // 意図: leaf.detach() でウィンドウを閉じるため、ItemView としてキャストして leaf を参照する。
  const view = useObsidianComponent() as unknown as DaystreamEditorView;
  const { shell, storage } = useAppContext();
  const { inputRef } = useEditorRefs();

  const { inputSnapshot, inputSnapshotVersion, syncInputSession, editingPost } =
    useEditorStore(
      useShallow((s) => ({
        inputSnapshot: s.inputSnapshot,
        inputSnapshotVersion: s.inputSnapshotVersion,
        syncInputSession: s.syncInputSession,
        editingPost: s.editingPost,
      })),
    );

  const { clearInput } = useEditorStore(
    useShallow((s) => ({ clearInput: s.clearInput })),
  );

  const { posts } = usePosts();
  const canSubmit = useEditorStore((s) => s.canSubmit(posts));

  const { handleSubmit } = usePostActions();

  const ctrlEnterSends = useSettingsStore(
    (s) => s.pluginSettings?.ctrlEnterSends ?? "disabled",
  );

  const closeView = useCallback(() => {
    view.leaf.detach();
  }, [view]);

  const handleCancel = useCallback(async () => {
    const originalMessage = editingPost?.message ?? "";
    const hasChanged = inputSnapshot.trim() !== originalMessage.trim();

    // 意図: 変更がない場合は確認なしで閉じる。
    if (!hasChanged) {
      clearInput();
      closeView();
      return;
    }

    // 意図: 「二度と表示しない」が保存済みの場合は確認をスキップして破棄する。
    const skipConfirm = storage.get<boolean>(
      STORAGE_KEYS.SKIP_POPOUT_DISCARD_CONFIRM,
      false,
    );
    if (skipConfirm) {
      clearInput();
      closeView();
      return;
    }

    const result = await new DiscardConfirmModal(shell.getRawApp()).show();

    if (!result.confirmed) return;

    // 意図: 「二度と表示しない」が選ばれた場合は今後スキップするよう保存する。
    if (result.neverShowAgain) {
      storage.set(STORAGE_KEYS.SKIP_POPOUT_DISCARD_CONFIRM, true);
    }

    clearInput();
    closeView();
  }, [editingPost, inputSnapshot, storage, shell, clearInput, closeView]);

  const handleSubmitAndClose = useCallback(async () => {
    if (!canSubmit) return;
    await handleSubmit();
    // 意図: submit は成功時に clearInput するため、その後に閉じる。
    closeView();
  }, [canSubmit, handleSubmit, closeView]);

  // 意図: popout が開いた直後にエディタへフォーカスを移し、すぐに入力できるようにする。
  useEditorFocus(inputRef, editingPost);

  useEffect(() => {
    const closeAction = view.addAction("x", "閉じる", () => {
      void handleCancel();
    });
    closeAction.setAttr("data-daystream-popout-actions", "true");

    const submitAction = view.addAction("send-horizontal", "投稿", () => {
      void handleSubmitAndClose();
    });
    submitAction.setAttr("data-daystream-popout-actions", "true");

    return () => {
      submitAction.detach();
      closeAction.detach();
    };
  }, [handleCancel, handleSubmitAndClose, view]);

  return (
    <Flex className="daystream-popout-editor h-full w-full flex-col overflow-hidden bg-[var(--background-primary)]">
      {/* 意図: ポップアウトはエディタ全体を表示するため、通常サイズ限定の送信対象から除外する。 */}
      <ObsidianLiveEditor
        ref={inputRef}
        leaf={view.leaf}
        app={shell.getRawApp()}
        initialValue={inputSnapshot}
        externalVersion={inputSnapshotVersion}
        onChange={syncInputSession}
        onSubmit={handleSubmitAndClose}
        className="daystream-popout-editor__editor flex-1 min-h-0 mx-[var(--size-4-4)]"
        placeholder={PLACEHOLDER_TEXT}
        isReadOnly={false}
        ctrlEnterSends={ctrlEnterSends}
        isExpanded
      />
    </Flex>
  );
});
