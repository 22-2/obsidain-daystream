import type { FC, MouseEventHandler } from "react";
import { replaceDayToJa } from "src/core/strings";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { Box, Flex, Text } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import type { MomentLike } from "src/ui/types";

interface DateDividerProps {
  date?: MomentLike;
  count?: number;
  label?: string;
  leadingIconName?: string;
  collapsed?: boolean;
  showCollapseIcon?: boolean;
  onClick?: () => void;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
}

export const DateDivider: FC<DateDividerProps> = ({
  date,
  label,
  count,
  leadingIconName,
  collapsed = false,
  showCollapseIcon = false,
  onClick,
  onContextMenu,
}) => {
  const clickable = typeof onClick === "function";
  // 意図: 当日のdividerだけ視認性を上げ、時系列の現在位置を見失いにくくする。
  const isTodayDivider = date?.isSame(new Date(), "day") ?? false;
  const title = label ?? (date ? replaceDayToJa(date.format("YYYY-MM-DD (ddd)")) : "");

  return (
    <Flex
      className={cn(
        "mfdi-date-divider items-center py-[var(--size-4-2)] px-[var(--size-4-4)] gap-[var(--size-4-4)]",
        { "cursor-pointer": clickable },
      )}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <Box className="flex-1 h-[1px] bg-[var(--background-modifier-border)] opacity-50" />
      <Text
        className={`flex items-center gap-1 text-[length:var(--font-ui-smaller)] font-semibold whitespace-nowrap tracking-[0.05em] uppercase ${
          isTodayDivider ? "text-[var(--interactive-accent)]" : "text-[var(--text-muted)]"
        }`}
      >
        {clickable && showCollapseIcon && (
          <ObsidianIcon name={collapsed ? "chevron-right" : "chevron-down"} size="0.95em" />
        )}
        {leadingIconName && <ObsidianIcon name={leadingIconName} size="0.95em" />}
        {title}
        {count !== undefined && ` (${count})`}
      </Text>
      <Box className="flex-1 h-[1px] bg-[var(--background-modifier-border)] opacity-50" />
    </Flex>
  );
};
