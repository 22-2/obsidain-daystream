import { Menu } from "obsidian";
import { memo, useCallback, type FC, type MouseEvent } from "react";
import { IconButton } from "src/core/ui/components/common/IconButton";
import {
  isEditorAlreadyInSeparateWindow,
  showEditorContextMenu,
} from "src/features/composer/components/inputarea/editorContextMenu";
import { FULL_EXPANSION_STYLE } from "src/features/composer/components/inputarea/constants";
import { InputAreaFooterBase } from "src/features/composer/components/inputarea/InputAreaFooterBase";
import { InputAreaMetadataActions } from "src/features/composer/components/inputarea/InputAreaMetadataActions";
import { cn } from "src/core/ui/components/primitives/utils";
import { INPUT_AREA_SIZE } from "src/features/workspace/config/constants";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useObsidianComponent } from "src/core/ui/context/ComponentContext";
import { useEditorRefs } from "src/features/composer/context/EditorRefsContext";
import { useSubmitAction } from "src/features/composer/hooks/useSubmitAction";
import { usePosts } from "src/features/posts/hooks/usePosts";
import { useAppStore, useRequiredAppStore } from "src/features/workspace/store/appStore";
import { useEditorStore } from "src/features/composer/store/editorStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { reportSubmitFailure } from "src/features/composer/utils/composer-failure";
import { isComposerHostView } from "src/features/composer/types/composer-host";
import { useShallow } from "zustand/shallow";

export const InputAreaFooter: FC<{
  onToggleExpand: () => void;
  onOpenInNewWindow: () => void;
}> = memo(({ onToggleExpand, onOpenInNewWindow }) => {
  const { settings } = useAppContext();
  const component = useObsidianComponent(isComposerHostView);
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
  const { handleSubmit } = useSubmitAction();

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
      tooltip="入力欄を最大化"
      size="1em"
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
        // 意図: 展開方法のメニューは最大化中だけに限定し、通常表示では開かない。
        if (!isMaximized) return;
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
      tooltip={editingPost ? "更新" : "投稿"}
      size="1em"
      onActivate={() => {
        if (isReadOnly || !canSubmit) return;
        handleSubmit().catch(reportSubmitFailure);
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
      className="dstr-input-area-footer group"
      onClick={handleClick}
      canSubmit={canSubmit}
      onSubmit={() => {
        handleSubmit().catch(reportSubmitFailure);
      }}
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
