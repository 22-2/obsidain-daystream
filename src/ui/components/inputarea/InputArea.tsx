import type { WorkspaceLeaf } from "obsidian";
import type { FC } from "react";
import { memo, useCallback, useEffect } from "react";
import { ObsidianLiveEditor } from "src/ui/components/editor/ObsidianLiveEditor";
import { InputAreaControl } from "src/ui/components/inputarea/InputAreaControl";
import { InputAreaFooter } from "src/ui/components/inputarea/InputAreaFooter";
import { Flex } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import {
  INPUT_AREA_SIZE,
  PLACEHOLDER_TEXT,
  READONLY_PLACEHOLDER_TEXT,
} from "src/ui/config/consntants";
import { useAppContext } from "src/ui/context/AppContext";
import { useObsidianComponent } from "src/ui/context/ComponentContext";
import { useEditorRefs } from "src/ui/context/EditorRefsContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

export const InputArea: FC = memo(() => {
  // 意図: MFDIView と MFDIEditorView どちらから呼ばれても動くよう、
  // leaf だけを要求する最小限の構造型にキャストする。
  const component = useObsidianComponent() as unknown as {
    leaf: WorkspaceLeaf;
  };
  const { shell } = useAppContext();
  const { inputRef } = useEditorRefs();
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
  // startEdit 後にエディタへフォーカスを移す
  const editingPostId = editingPost?.id ?? null;

  const { isReadOnly, inputAreaSize, setInputAreaSize, ctrlEnterSends } = useSettingsStore(
    useShallow((s) => ({
      isReadOnly: s.isReadOnly(),
      inputAreaSize: s.inputAreaSize,
      setInputAreaSize: s.setInputAreaSize,
      ctrlEnterSends: s.pluginSettings?.ctrlEnterSends ?? false,
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
    openInputInNewWindow(inputSnapshot, editingPost, draftMetadata, draftMetadataBase);
  }, [openInputInNewWindow, inputSnapshot, editingPost, draftMetadata, draftMetadataBase]);

  useEffect(() => {
    if (editingPostId !== null) {
      setTimeout(() => inputRef.current?.focus());
    }
  }, [editingPostId]);

  return (
    <Flex
      className={cn(
        // 常時適用する基本クラス
        "mfdi-input-area flex flex-col rounded-t-[22px] p-0 bg-[var(--background-secondary)] border border-[var(--table-border-color)]",
        {
          // 条件付きクラス
          "mod-read-only": isReadOnly,
          "mod-maxmized": inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED,
          "mod-minimized": inputAreaSize === INPUT_AREA_SIZE.MINIMIZED,
        },
      )}
    >
      <InputAreaControl
        isReadOnly={isReadOnly}
        inputAreaSize={inputAreaSize}
        onMaximizeToMaxHeight={handleExpandToMaxHeight}
        onMinimize={handleMinimize}
      />

      {isMinimized ? null : (
        <>
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
          />
          <InputAreaFooter />
        </>
      )}
    </Flex>
  );
});
