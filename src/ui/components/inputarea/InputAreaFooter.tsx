import { Menu } from "obsidian";
import { memo, useCallback, type FC, type MouseEvent } from "react";
import { IconButton } from "src/ui/components/common/IconButton";
import {
  isEditorAlreadyInSeparateWindow,
  showEditorContextMenu,
} from "src/ui/components/inputarea/editorContextMenu";
import { FULL_EXPANSION_STYLE } from "src/ui/components/inputarea/constants";
import { InputAreaFooterBase } from "src/ui/components/inputarea/InputAreaFooterBase";
import { InputAreaMetadataActions } from "src/ui/components/inputarea/InputAreaMetadataActions";
import { cn } from "src/ui/components/primitives/utils";
import { INPUT_AREA_SIZE } from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { useObsidianComponent } from "src/ui/context/ComponentContext";
import { useEditorRefs } from "src/ui/context/EditorRefsContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { usePosts } from "src/ui/hooks/usePosts";
import { useAppStore, useRequiredAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { MFDIView } from "src/ui/view/MFDIView";
import { useShallow } from "zustand/shallow";

export const InputAreaFooter: FC<{
  onToggleExpand: () => void;
  onOpenInNewWindow: () => void;
}> = memo(({ onToggleExpand, onOpenInNewWindow }) => {
  const { settings } = useAppContext();
  const component = useObsidianComponent() as MFDIView;
  const store = useRequiredAppStore();
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

  const handleSubmitContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
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
      menu.showAtMouseEvent(event.nativeEvent);
    },
    [addDraft, clearInput, inputSnapshot],
  );

  // 意図: 上段の操作列を廃止し、展開操作を投稿操作の直前へまとめて
  // 入力中の視線移動を減らす。
  const expandAction = (
    <IconButton
      name="maximize"
      size="1em"
      ariaLabel="入力欄を最大化"
      onActivate={() => {
        if (isReadOnly) return;
        onToggleExpand();
      }}
      isDisabled={isReadOnly}
      className={cn(
        "h-6 w-6",
        isReadOnly
          ? "cursor-default opacity-30"
          : isMaximized
            ? "text-[var(--text-accent)] hover:text-[var(--text-normal)]"
            : "",
      )}
      onContextMenu={(event) => {
        showEditorContextMenu(event, {
          editorExpansionMode: settings.editorExpansionMode,
          hasEditorPopout: isEditorAlreadyInSeparateWindow(component),
          onOpenInNewWindow,
          onChangeEditorExpansionMode: (mode) => {
            // 意図: 右クリックから変更した展開モードを設定画面や次回起動にも反映する。
            store.getState().setPluginSettings({ ...settings, editorExpansionMode: mode });
            void component.setEditorExpansionMode(mode);
          },
        });
      }}
    />
  );

  // 意図: 投稿ボタンは背景付きの四角形ではなく、フッターの幅を圧迫しない
  // 小さなアイコン操作として表示する。
  const submitAction = (
    <IconButton
      name="send-horizontal"
      size="1em"
      ariaLabel={editingPost ? "更新" : "投稿"}
      onActivate={() => {
        if (isReadOnly || !canSubmit) return;
        void handleSubmit();
      }}
      isDisabled={isReadOnly || !canSubmit}
      className={cn(
        "h-6 w-6",
        isReadOnly || !canSubmit
          ? "cursor-default opacity-50"
          : "text-[var(--text-accent)] hover:text-[var(--text-accent)]",
      )}
      onContextMenu={handleSubmitContextMenu}
    />
  );

  return (
    <InputAreaFooterBase
      className="mfdi-input-area-footer group"
      onClick={handleClick}
      canSubmit={canSubmit}
      submitAriaLabel={editingPost ? "更新" : "投稿"}
      onSubmit={handleSubmit}
      onCancel={editingPost ? cancelEdit : undefined}
      characterCount={inputSnapshot.length}
      leadingActions={<InputAreaMetadataActions isReadOnly={isReadOnly} />}
      beforeSubmitAction={expandAction}
      submitAction={submitAction}
    >
      {isMaximized && editorExpansionMode === "full" && <style>{FULL_EXPANSION_STYLE}</style>}
    </InputAreaFooterBase>
  );
});
