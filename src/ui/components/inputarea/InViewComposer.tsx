import type { FC } from "react";
import { memo, useCallback, useEffect } from "react";
import { ObsidianLiveEditor } from "src/ui/components/editor/ObsidianLiveEditor";
import { Flex } from "src/ui/components/primitives";
import { PLACEHOLDER_TEXT } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { useObsidianComponent } from "src/ui/context/ComponentContext";
import { useEditorRefs } from "src/ui/context/EditorRefsContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { usePosts } from "src/ui/hooks/usePosts";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { MFDIView } from "src/ui/view/MFDIView";
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
    (s) => s.pluginSettings?.ctrlEnterSends ?? false,
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

  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus());
  }, [inputRef]);

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
      />
    </Flex>
  );
});
