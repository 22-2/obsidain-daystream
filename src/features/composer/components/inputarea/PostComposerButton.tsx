import { useEffect, useRef } from "react";
import { ObsidianIcon } from "src/core/ui/components/common/ObsidianIcon";
import { FloatingButton } from "src/core/ui/components/primitives/FloatingButton";
import { cn } from "src/core/ui/components/primitives/utils";
import { usePostComposer } from "src/features/composer/hooks/usePostComposer";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { useShallow } from "zustand/shallow";

/**
 * タイムライン上の入力欄を常設せず、必要なときだけ投稿入力画面を開く導線。
 * 閉じた入力は editor store の closeComposer が下書きへ移してから消去する。
 */
export const PostComposerButton: React.FC = () => {
  const openedEditingIdRef = useRef<string | null>(null);
  const { editingPost, isReadOnly, openComposer } = usePostComposer();

  const { rightPanelOpen } = useSettingsStore(
    useShallow((state) => ({
      rightPanelOpen: state.rightPanelOpen ?? state.sidebarOpen,
    })),
  );

  useEffect(() => {
    if (!editingPost) {
      openedEditingIdRef.current = null;
      return;
    }
    if (openedEditingIdRef.current === editingPost.id) return;
    openedEditingIdRef.current = editingPost.id;
    openComposer();
  }, [editingPost, openComposer]);

  return (
    <FloatingButton
      tooltip="新しい投稿"
      className={cn(
        "mfdi-compose-button fixed bottom-8",
        rightPanelOpen ? "right-[calc(276px+2rem)]" : "right-8",
      )}
      onClick={openComposer}
      visible={!isReadOnly}
    >
      <ObsidianIcon
        name="pencil"
        className="text-[var(--text-on-accent)] hover:text-[var(--text-on-accent)]"
        size="1.35em"
      />
    </FloatingButton>
  );
};
