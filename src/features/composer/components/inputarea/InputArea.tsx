import type { WorkspaceLeaf } from "obsidian";
import type { FC } from "react";
import { memo, useCallback } from "react";
import { ObsidianLiveEditor } from "src/features/composer/components/editor/ObsidianLiveEditor";
import { InputAreaFooter } from "src/features/composer/components/inputarea/InputAreaFooter";
import { Flex } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";
import {
  INPUT_AREA_SIZE,
  PLACEHOLDER_TEXT,
  READONLY_PLACEHOLDER_TEXT,
} from "src/features/workspace/config/constants";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useObsidianComponent } from "src/core/ui/context/ComponentContext";
import { useEditorRefs } from "src/features/composer/context/EditorRefsContext";
import { useEditorFocus } from "src/features/composer/hooks/useEditorFocus";
import { usePostActions } from "src/features/posts/hooks/internal/usePostActions";
import { useObsidianUi } from "src/features/workspace/hooks/useObsidianUi";
import { useEditorStore } from "src/features/composer/store/editorStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { useShallow } from "zustand/shallow";

export const InputArea: FC = memo(() => {
  // 意図: MFDIView と MFDIEditorView どちらから呼ばれても動くよう、
  // leaf だけを要求する最小限の構造型にキャストする。
  const component = useObsidianComponent() as unknown as {
    leaf: WorkspaceLeaf;
  };
  const { shell } = useAppContext();
  const { inputRef, scrollContainerRef } = useEditorRefs();
  const {
    inputSnapshot,
    inputSnapshotVersion,
    syncInputSession,
    editingPost,
    draftMetadata,
    draftMetadataBase,
  } = useEditorStore(
    useShallow((s) => ({
      inputSnapshot: s.inputSnapshot,
      inputSnapshotVersion: s.inputSnapshotVersion,
      syncInputSession: s.syncInputSession,
      editingPost: s.editingPost,
      draftMetadata: s.draftMetadata,
      draftMetadataBase: s.draftMetadataBase,
    })),
  );

  const { isReadOnly, inputAreaSize, setInputAreaSize, ctrlEnterSends } =
    useSettingsStore(
      useShallow((s) => ({
        isReadOnly: s.isReadOnly(),
        inputAreaSize: s.inputAreaSize,
        setInputAreaSize: s.setInputAreaSize,
        ctrlEnterSends: s.pluginSettings?.ctrlEnterSends ?? "disabled",
      })),
    );
  const { handleSubmit } = usePostActions();
  const { openInputInNewWindow } = useObsidianUi();
  const isMinimized = inputAreaSize === INPUT_AREA_SIZE.MINIMIZED;

  const handleExpandToMaxHeight = useCallback(() => {
    // 意図: クラス付与のみで expand/collapse を切り替え、スタイル責務を CSS に寄せる。
    setInputAreaSize(
      inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED
        ? INPUT_AREA_SIZE.DEFAULT
        : INPUT_AREA_SIZE.MAXIMIZED,
    );
  }, [inputAreaSize, setInputAreaSize]);

  const handleMinimize = useCallback(() => {
    // 意図: minimize ボタンは既存の popout 配線へ寄せ、編集・新規どちらも別ウィンドウで継続できるようにする。
    openInputInNewWindow(
      inputSnapshot,
      editingPost,
      draftMetadata,
      draftMetadataBase,
    );
  }, [
    openInputInNewWindow,
    inputSnapshot,
    editingPost,
    draftMetadata,
    draftMetadataBase,
  ]);

  useEditorFocus(
    inputRef,
    editingPost,
    editingPost !== null && !isMinimized && !isReadOnly,
    scrollContainerRef,
  );

  return (
    <Flex
      className={cn(
        // 常時適用する基本クラス
        // 意図: 入力エリアの上端は操作バーをなくしたため、丸いカード形状ではなく
        // 一覧と連続する直線的な境界にする。
        "mfdi-input-area flex flex-col rounded-t-none pt-8 bg-[var(--background-secondary)] border border-[var(--table-border-color)]",
        {
          // 条件付きクラス
          "mod-read-only": isReadOnly,
          "mod-maxmized": inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED,
          "mod-minimized": inputAreaSize === INPUT_AREA_SIZE.MINIMIZED,
        },
      )}
    >
      {isMinimized ? null : (
        <ObsidianLiveEditor
          ref={inputRef}
          leaf={component.leaf}
          app={shell.getRawApp()}
          initialValue={inputSnapshot}
          externalVersion={inputSnapshotVersion}
          onChange={syncInputSession}
          onSubmit={handleSubmit}
          className="mfdi-editor-wrapper mx-[var(--size-4-4)]"
          placeholder={PLACEHOLDER_TEXT}
          isReadOnly={isReadOnly}
          readonlyPlaceholder={READONLY_PLACEHOLDER_TEXT}
          ctrlEnterSends={ctrlEnterSends}
          isExpanded={inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED}
        />
      )}
      <InputAreaFooter
        onToggleExpand={handleExpandToMaxHeight}
        onOpenInNewWindow={handleMinimize}
      />
    </Flex>
  );
});
