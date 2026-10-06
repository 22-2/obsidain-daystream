import { Menu } from "obsidian";
import React from "react";
import type { Topic } from "src/core/topic";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { Box, HStack, Text } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import { useObsidianTooltip } from "src/ui/hooks/useObsidianTooltip";

interface TopicItemProps {
  topic: Topic;
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onSwitch: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onStartEdit: (id: string, title: string) => void;
  onEditingTitleChange: (title: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
}

export const TopicItem = ({
  topic,
  isActive,
  isEditing,
  editingTitle,
  editInputRef,
  onSwitch,
  onToggleArchive,
  onStartEdit,
  onEditingTitleChange,
  onCommitEdit,
  onCancelEdit,
}: TopicItemProps) => {
  const menuTooltipRef = useObsidianTooltip("メニュー");
  const handleOpenMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const menu = new Menu();

    if (topic.id !== "") {
      if (!isActive) {
        menu.addItem((item) =>
          item
            .setTitle("このトピックに切り替え")
            .setIcon("check")
            .onClick(() => onSwitch(topic.id)),
        );
      }

      menu.addItem((item) =>
        item
          .setTitle("タイトルを変更")
          .setIcon("pencil")
          .onClick(() => {
            onStartEdit(topic.id, topic.title);
            setTimeout(() => editInputRef.current?.focus(), 50);
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle(topic.archived ? "アーカイブ解除" : "アーカイブ")
          .setIcon(topic.archived ? "unarchive" : "archive")
          .onClick(() => onToggleArchive(topic.id)),
      );
    } else if (!isActive) {
      menu.addItem((item) =>
        item
          .setTitle("このトピックに切り替え")
          .setIcon("check")
          .onClick(() => onSwitch(topic.id)),
      );
    }

    menu.showAtMouseEvent(e.nativeEvent);
  };

  return (
    <Box
      className={cn(
        "flex items-center px-[var(--size-4-3)] py-[var(--size-4-2)] cursor-pointer rounded-[var(--radius-m)] transition-all duration-150",
        isActive
          ? "bg-[var(--background-modifier-active-hover)]"
          : "bg-[var(--background-secondary)]",
        topic.archived ? "opacity-60" : "opacity-100",
        "hover:bg-[var(--background-modifier-hover)] hover:opacity-100",
      )}
      onDoubleClick={() => onSwitch(topic.id)}
    >
      {/* Indicator Bar */}
      <Box
        ref={menuTooltipRef}
        className={cn(
          "w-[3px] h-[2.5em] rounded-[2px] mr-[var(--size-4-3)] shrink-0 transition-[background] duration-150",
          isActive ? "bg-[var(--color-accent)]" : "bg-[var(--background-secondary)]",
        )}
      />

      <Box className={cn("flex-1 min-w-0")}>
        {isEditing ? (
          <input
            ref={editInputRef}
            className={cn(
              "w-full text-sm px-2 py-1 bg-[var(--background-primary)] text-[var(--text-normal)]",
              "border border-[var(--color-accent)] rounded outline-none",
            )}
            value={editingTitle}
            onChange={(e) => onEditingTitleChange(e.target.value)}
            onBlur={onCommitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            autoFocus
          />
        ) : (
          <>
            <HStack className={cn("gap-[var(--size-4-2)] items-center")}>
              <Text
                className={cn(
                  "truncate leading-[1.4] text-[var(--text-normal)]",
                  isActive ? "font-semibold" : "font-normal",
                )}
              >
                {topic.title}
              </Text>
              {isActive && (
                <Box
                  className={cn(
                    "text-[0.65em] px-[0.4em] rounded-[4px] bg-[var(--color-accent)] text-[var(--text-on-accent)] whitespace-nowrap",
                  )}
                >
                  使用中
                </Box>
              )}
              {topic.archived && !isActive && (
                <Box
                  className={cn(
                    "text-[0.65em] px-[0.4em] rounded-[4px] border border-[var(--background-modifier-border)] text-[var(--text-faint)] whitespace-nowrap",
                  )}
                >
                  アーカイブ
                </Box>
              )}
            </HStack>
            <Text
              className={cn(
                "text-[length:var(--font-ui-smaller)] text-[var(--text-muted)] leading-[1.4] mt-[1px]",
              )}
            >
              {topic.id === "" ? "(デフォルト)" : topic.id}
            </Text>
          </>
        )}
      </Box>

      <Box
        className={cn("h-6 w-6 flex items-center justify-center shrink-0 cursor-pointer")}
        onClick={handleOpenMenu}
      >
        <ObsidianIcon name="more-horizontal" size="1.1em" />
      </Box>
    </Box>
  );
};
