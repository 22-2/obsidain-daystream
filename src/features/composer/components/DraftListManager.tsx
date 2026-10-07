import { Menu } from "obsidian";
import React from "react";
import { ObsidianIcon } from "src/core/ui/components/common/ObsidianIcon";
import { Box, HStack, Text } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";
import { useObsidianUi } from "src/features/workspace/hooks/useObsidianUi";
import { useAppStore } from "src/features/workspace/store/appStore";
import { useShallow } from "zustand/shallow";

interface DraftListManagerProps {
  onClose: () => void;
}

export const DraftListManager: React.FC<DraftListManagerProps> = ({ onClose }) => {
  const { confirmDeleteAction } = useObsidianUi();
  const { drafts, removeDraft, replaceInput } = useAppStore(
    useShallow((s) => ({
      drafts: s.drafts,
      removeDraft: s.removeDraft,
      replaceInput: s.replaceInput,
    })),
  );
  const { setDraftMetadata, setDraftMetadataBase } = useAppStore(
    useShallow((s) => ({
      setDraftMetadata: s.setDraftMetadata,
      setDraftMetadataBase: s.setDraftMetadataBase,
    })),
  );

  const formatTime = (timestamp: number) => {
    const now = window.moment();
    const target = window.moment(timestamp);
    if (now.isSame(target, "day")) {
      return target.format("HH:mm");
    }
    return target.format("YYYY/MM/DD HH:mm");
  };

  return (
    <Box
      className={cn(
        "bg-[var(--background-primary)] text-[var(--text-normal)] h-full flex flex-col",
      )}
    >
      {/* Header */}
      <Box
        className={cn(
          "flex items-center p-4 border-b border-[var(--background-modifier-border)] relative",
        )}
      >
        <Box
          onClick={onClose}
          className={cn(
            "flex items-center gap-1 text-[var(--text-accent)] font-bold hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer p-0",
          )}
        >
          <ObsidianIcon name="chevron-left" size="1.2em" />
          <Text className={cn("text-[var(--text-accent)] font-bold")}>戻る</Text>
        </Box>
        <Box className={cn("absolute left-1/2 -translate-x-1/2 pointer-events-none")}>
          <Text className={cn("font-bold text-lg")}>下書き</Text>
        </Box>
      </Box>

      {/* Main Content */}
      <Box className={cn("p-[1.2em] overflow-y-auto flex-1 flex flex-col mfdi-draft-list")}>
        {drafts.length === 0 ? (
          <Box
            className={cn(
              "flex flex-col items-center justify-center flex-1 text-[var(--text-faint)] gap-[1.5em]",
            )}
          >
            <ObsidianIcon name="file-x" size="4em" className={cn("opacity-30")} />
            <Text className={cn("text-base opacity-60 font-bold")}>下書きはありません</Text>
          </Box>
        ) : (
          <Box className={cn("flex flex-col gap-4 items-stretch")}>
            {drafts.map((draft) => (
              <Box
                key={draft.id}
                className={cn(
                  "p-[1.2em] bg-[var(--background-secondary)] rounded-[15px] transition-all border border-transparent",
                  "hover:bg-[var(--background-modifier-hover)] hover:border-[var(--background-modifier-border)]",
                )}
              >
                <HStack className={cn("justify-between mb-[0.4em] items-center")}>
                  <Text className={cn("text-[10px] text-[var(--text-muted)] font-bold")}>
                    {formatTime(draft.createdAt)}
                  </Text>
                  <Box
                    className={cn(
                      "cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-normal)] transition-colors p-1",
                    )}
                    onClick={(e) => {
                      const menu = new Menu();
                      menu.addItem((item) => {
                        item
                          .setTitle("コピー")
                          .setIcon("copy")
                          .onClick(() => {
                            navigator.clipboard.writeText(draft.content);
                          });
                      });

                      menu.addSeparator();

                      menu.addItem((item) => {
                        item
                          .setTitle("復元")
                          .setIcon("refresh-cw")
                          .onClick(() => {
                            replaceInput(draft.content);
                            // 意図: 保存済みドラフトは本文のみを戻し、前回のピン/タグ状態は引き継がない。
                            setDraftMetadata({});
                            setDraftMetadataBase({});
                            onClose();
                          });
                      });
                      menu.addItem((item) => {
                        item
                          .setTitle("削除")
                          .setIcon("trash")
                          .setWarning(true)
                          .onClick(() => {
                            confirmDeleteAction(async () => {
                              removeDraft(draft.id);
                            });
                          });
                      });
                      menu.showAtPosition({
                        x: e.clientX,
                        y: e.clientY,
                      });
                      e.stopPropagation();
                    }}
                  >
                    <ObsidianIcon name="more-horizontal" size="1.2em" />
                  </Box>
                </HStack>
                <Text
                  className={cn(
                    "text-sm leading-[1.4] select-text text-[var(--text-normal)] line-clamp-3",
                  )}
                >
                  {draft.content}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
