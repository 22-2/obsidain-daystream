import type { FC } from "react";
import { memo, useCallback, useEffect } from "react";
import { ObsidianLiveEditor } from "src/features/composer/components/editor/ObsidianLiveEditor";
import { Flex } from "src/core/ui/components/primitives";
import { PLACEHOLDER_TEXT } from "src/features/workspace/config/constants";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useObsidianComponent } from "src/core/ui/context/ComponentContext";
import { useEditorRefs } from "src/features/composer/context/EditorRefsContext";
import { useEditorFocus } from "src/features/composer/hooks/useEditorFocus";
import { usePostActions } from "src/features/posts/hooks/internal/usePostActions";
import { usePosts } from "src/features/posts/hooks/usePosts";
import { useEditorStore } from "src/features/composer/store/editorStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { MFDIView } from "src/features/workspace/views/MFDIView";
import { useShallow } from "zustand/shallow";

/** メインビュー全体を使う一時的な投稿エディタ。 */
export const InViewComposer: FC = memo(() => {
  const view = useObsidianComponent() as MFDIView;
  const { shell } = useAppContext();
  const { inputRef } = useEditorRefs();
  const {
    inputSnapshot,
    inputSnapshotVersion,
    syncInputSession,
    editingPost,
    cancelEdit,
    closeComposer,
  } = useEditorStore(
    useShallow((s) => ({
      inputSnapshot: s.inputSnapshot,
      inputSnapshotVersion: s.inputSnapshotVersion,
      syncInputSession: s.syncInputSession,
      editingPost: s.editingPost,
      cancelEdit: s.cancelEdit,
      closeComposer: s.closeComposer,
    })),
  );
  const { posts } = usePosts();
  const canSubmit = useEditorStore((s) => s.canSubmit(posts));
  const { handleSubmit } = usePostActions();
  const ctrlEnterSends = useSettingsStore(
    (s) => s.pluginSettings?.ctrlEnterSends ?? "disabled",
  );

  const handleClose = useCallback(() => {
    if (editingPost) cancelEdit();
    closeComposer();
  }, [cancelEdit, closeComposer, editingPost]);

  const handleSubmitAndClose = useCallback(async () => {
    if (!canSubmit) return;
    await handleSubmit();
    closeComposer();
  }, [canSubmit, closeComposer, handleSubmit]);

  useEditorFocus(inputRef, editingPost);

  useEffect(() => {
    Array.from(view.actionsEl.children)
      .filter((element) => element.getAttr("data-mfdi-actions") === "true")
      .forEach((element) => element.detach());

    const closeAction = view.addAction("x", "閉じる", handleClose);
    closeAction.setAttr("data-mfdi-composer-actions", "true");

    const saveAction = view.addAction("send-horizontal", "投稿", () => {
      void handleSubmitAndClose();
    });
    saveAction.setAttr("data-mfdi-composer-actions", "true");

    return () => {
      saveAction.detach();
      closeAction.detach();
      view.refreshActions();
    };
  }, [handleClose, handleSubmitAndClose, view]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  return (
    <Flex className="mfdi-in-view-composer h-full w-full flex-col overflow-hidden bg-[var(--background-primary)]">
      {/* 意図: 全画面の一時コンポーザも展開中と同じ扱いにして、設定の文言と挙動を揃える。 */}
      <ObsidianLiveEditor
        ref={inputRef}
        leaf={view.leaf}
        app={shell.getRawApp()}
        initialValue={inputSnapshot}
        externalVersion={inputSnapshotVersion}
        onChange={syncInputSession}
        onSubmit={handleSubmitAndClose}
        className="mfdi-in-view-composer__editor flex-1 min-h-0 mx-[var(--size-4-4)]"
        placeholder={PLACEHOLDER_TEXT}
        isReadOnly={false}
        ctrlEnterSends={ctrlEnterSends}
        isExpanded
      />
    </Flex>
  );
});
