import { memo, useCallback, useMemo, type FC } from "react";
import { TAG_METADATA_KEY, serializeMfdiTags } from "src/core/tags";
import { IconButton } from "src/ui/components/common/IconButton";
import { HStack } from "src/ui/components/primitives";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { useEditorStore } from "src/ui/store/editorStore";
import { PINNED_METADATA_KEY, getRawTagMetadata, isPinned } from "src/ui/utils/post-metadata";
import { getMFDIViewCapabilities } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

type InputAreaMetadataActionsProps = {
  isReadOnly: boolean;
};

export const InputAreaMetadataActions: FC<InputAreaMetadataActionsProps> = memo(
  ({ isReadOnly }) => {
    const { showTextInput } = useObsidianUi();
    const { draftMetadata, setDraftMetadata, viewNoteMode } = useEditorStore(
      useShallow((s) => ({
        draftMetadata: s.draftMetadata,
        setDraftMetadata: s.setDraftMetadata,
        viewNoteMode: s.viewNoteMode,
      })),
    );

    const capabilities = useMemo(
      () => getMFDIViewCapabilities({ noteMode: viewNoteMode }),
      [viewNoteMode],
    );

    const handleTogglePin = useCallback(() => {
      if (isReadOnly) return;

      const nextMetadata = { ...draftMetadata };
      if (isPinned(nextMetadata)) {
        // 意図: 解除時はキーを消して、submit 時に「ピン留めなし」を正しく保存する。
        delete nextMetadata[PINNED_METADATA_KEY];
      } else {
        nextMetadata[PINNED_METADATA_KEY] = "1";
      }
      setDraftMetadata(nextMetadata);
    }, [draftMetadata, isReadOnly, setDraftMetadata]);

    const handleEditTags = useCallback(async () => {
      if (isReadOnly) return;

      const nextValue = await showTextInput({
        title: "タグを入力",
        placeholder: "IT, Later",
        defaultValue: getRawTagMetadata(draftMetadata),
      });

      if (nextValue === null) return;

      const nextMetadata = { ...draftMetadata };
      const serializedTags = serializeMfdiTags(nextValue.split(","));
      if (serializedTags.length === 0) {
        // 意図: タグを空にした場合はキーごと消し、submit 時に残骸が残らないようにする。
        delete nextMetadata[TAG_METADATA_KEY];
      } else {
        nextMetadata[TAG_METADATA_KEY] = serializedTags;
      }
      setDraftMetadata(nextMetadata);
    }, [draftMetadata, isReadOnly, setDraftMetadata, showTextInput]);

    return (
      <HStack className="gap-[0.25em] items-center invisible group-hover:visible">
        {/* 意図: 左側のメタデータ操作も右端の投稿アイコンと同じ寸法に揃え、
            フッター内の操作列でボタンだけが大きく見えないようにする。 */}
        <IconButton
          name="pin"
          ariaLabel={isPinned(draftMetadata) ? "ピン留め解除" : "ピン留め"}
          title={isPinned(draftMetadata) ? "ピン留め解除" : "ピン留め"}
          onActivate={handleTogglePin}
          isDisabled={isReadOnly}
          size="1em"
          className="h-6 w-6"
        />
        {capabilities.supportsTags && (
          <IconButton
            name="tag"
            ariaLabel="タグ編集"
            onActivate={handleEditTags}
            isDisabled={isReadOnly}
            size="1em"
            className="h-6 w-6"
          />
        )}
      </HStack>
    );
  },
);
