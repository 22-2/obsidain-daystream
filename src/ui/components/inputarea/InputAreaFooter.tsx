import { Menu } from "obsidian";
import { memo, useCallback, type FC } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { FULL_EXPANSION_STYLE } from "src/ui/components/inputarea/constants";
import { InputAreaFooterBase } from "src/ui/components/inputarea/InputAreaFooterBase";
import { InputAreaMetadataActions } from "src/ui/components/inputarea/InputAreaMetadataActions";
import { cn } from "src/ui/components/primitives/utils";
import { INPUT_AREA_SIZE } from "src/ui/config/consntants";
import { useEditorRefs } from "src/ui/context/EditorRefsContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { usePosts } from "src/ui/hooks/usePosts";
import { useAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

export const InputAreaFooter: FC = memo(() => {
  const { posts } = usePosts();

  const { isReadOnly, inputAreaSize, editorExpansionMode } = useSettingsStore(
    useShallow((s) => ({
      isReadOnly: s.isReadOnly(),
      inputAreaSize: s.inputAreaSize,
      editorExpansionMode: s.pluginSettings?.editorExpansionMode ?? "default",
    })),
  );
  const isMaximized = inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED;

  const { canSubmit, cancelEdit } = useEditorStore(
    useShallow((s) => ({
      canSubmit: s.canSubmit(posts),
      cancelEdit: s.cancelEdit,
    })),
  );

  const { editingPost, inputSnapshot, clearInput } = useEditorStore(
    useShallow((s) => ({
      editingPost: s.editingPost,
      inputSnapshot: s.inputSnapshot,
      clearInput: s.clearInput,
    })),
  );

  const { addDraft } = useAppStore(
    useShallow((s) => ({
      addDraft: s.addDraft,
    })),
  );

  const { inputRef } = useEditorRefs();
  const { handleSubmit } = usePostActions();

  const handleClick = useCallback(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const submitLabel = isReadOnly ? (
    // 閲覧モードはアイコンをグレーアウト表示
    <ObsidianIcon
      name="send-horizontal"
      className="pointer-events-none cursor-default opacity-50"
      size="1em"
    />
  ) : (
    <ObsidianIcon
      name="send-horizontal"
      className={cn("pointer-events-none cursor-default", {
        // ObsidianIcon の base に text-[var(--icon-color)] があるため twMerge で上書き
        "text-[var(--text-on-accent)]": canSubmit,
      })}
      size="1em"
    />
  );

  return (
    <InputAreaFooterBase
      className="mfdi-input-area-footer group"
      onClick={handleClick}
      canSubmit={canSubmit}
      submitLabel={submitLabel}
      onSubmit={handleSubmit}
      onCancel={editingPost ? cancelEdit : undefined}
      characterCount={inputSnapshot.length}
      leadingActions={<InputAreaMetadataActions isReadOnly={isReadOnly} />}
      onSubmitContextMenu={(e) => {
        const menu = new Menu();
        menu.addItem((item) => {
          item
            .setTitle("下書きに追加")
            .setIcon("square-pen")
            .setDisabled(!inputSnapshot.trim())
            .onClick(() => {
              if (!inputSnapshot.trim()) return;
              addDraft(inputSnapshot);
              clearInput();
            });
        });
        menu.addItem((item) => {
          item
            .setTitle("クリア")
            .setIcon("delete")
            .setDisabled(!inputSnapshot)
            .onClick(() => {
              clearInput();
            });
        });
        menu.showAtMouseEvent(e.nativeEvent);
      }}
    >
      {isMaximized && editorExpansionMode === "full" && <style>{FULL_EXPANSION_STYLE}</style>}
    </InputAreaFooterBase>
  );
});
