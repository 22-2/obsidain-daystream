import React from "react";
import { Flex, HStack, Tag } from "src/core/ui/components/primitives";
import { DISPLAY_DATE_TIME_FORMAT } from "src/features/workspace/config/date-formats";
import type { Granularity } from "src/core/domain/granularity";
import type { MomentLike } from "src/core/domain/post";
import type { DateFilter } from "src/features/workspace/types";

interface BaseCardProps {
  timestamp: MomentLike;
  noteGranularity?: Granularity;
  showGranularityBadge?: boolean;
  granularity: Granularity;
  dateFilter?: DateFilter;
  isDimmed: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  footerAddon?: React.ReactNode;
  footerRightAddon?: React.ReactNode;
}

export const CardContent: React.FC<BaseCardProps> = ({
  timestamp,
  noteGranularity,
  showGranularityBadge = false,
  granularity,
  dateFilter,
  isDimmed,
  onContextMenu,
  onDoubleClick,
  children,
  footerAddon,
  footerRightAddon,
}) => {
  const dimClass = isDimmed ? "opacity-60 filter grayscale" : "";

  return (
    <Flex
      className={`base-card flex flex-col h-full max-h-[70vh] overflow-hidden px-[var(--size-4-2)] py-[var(--size-4-2)] ${dimClass}`}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      {/* 時刻は本文の起点として見つけやすい位置に固定する。 */}
      <HStack className="header gap-2 px-[var(--size-4-1)] pb-[var(--size-2-2)] text-[var(--text-muted)] text-[80%] items-start justify-start">
        <Tag className="text-xs px-0 py-0.5 rounded-full bg-[var(--tag-bg)] text-[var(--tag-fg)]">
          {/* fixedノートは複数日が混在しうるので、時刻だけだと投稿の文脈を失う。 */}
          {timestamp.format(DISPLAY_DATE_TIME_FORMAT)}
        </Tag>
        {showGranularityBadge && (noteGranularity === "day" || noteGranularity === "month") && (
          <span
            className="dstr-post-granularity-badge"
          >
            {noteGranularity === "day" ? "日次" : "月次"}
          </span>
        )}
      </HStack>

      {children}

      {(footerAddon || footerRightAddon) && (
        <HStack className="footer px-[var(--size-4-1)] pt-[var(--size-2-2)] text-[var(--text-muted)] text-[80%] items-center justify-end gap-[var(--size-2-3)] flex-wrap">
          {footerRightAddon}
          {footerAddon}
        </HStack>
      )}
    </Flex>
  );
};
