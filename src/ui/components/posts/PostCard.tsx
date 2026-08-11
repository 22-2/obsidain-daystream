import { setTooltip } from "obsidian";
import React, { useEffect, useState } from "react";
import type { HTMLMeta, ImageMeta, TwitterMeta } from "src/core/meta";
import { createMeta } from "src/core/meta";
import { pickUrls } from "src/core/strings";
import { isPresent } from "src/core/types";
import { CardContent } from "src/ui/components/cards/BaseCard";
import { Card } from "src/ui/components/cards/Card";
import { HTMLCard } from "src/ui/components/cards/HTMLCard";
import { ImageCard } from "src/ui/components/cards/ImageCard";
import { ReadMoreContent } from "src/ui/components/cards/ReadMoreContent";
import { TwitterCard } from "src/ui/components/cards/TwitterCard";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { ObsidianMarkdown } from "src/ui/components/common/ObsidianMarkdown";
import { Box, HStack, Tag, VStack } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import type { DateFilter, Granularity, MomentLike } from "src/ui/types";

export type PostCardProps = {
  message: string;
  sourcePath?: string;
  timestamp: MomentLike;
  granularity: Granularity;
  dateFilter?: DateFilter;
  isDimmed?: boolean;
  tags?: string[];
  backlinkCount?: number;
  /** スレッドルートのとき true にするとスレッドアイコンが表示される */
  showThreadIcon?: boolean;
  isThreadFocused?: boolean;
  isHighlighted?: boolean;
  enabledCardView?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  onOpenBacklinks?: () => void;
  onToggleThreadFocus?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export const PostCard = React.memo(
  ({
    message,
    sourcePath,
    timestamp,
    granularity,
    dateFilter,
    isDimmed = false,
    tags = [],
    backlinkCount = 0,
    showThreadIcon = false,
    isThreadFocused = false,
    isHighlighted = false,
    enabledCardView = false,
    onContextMenu,
    onDoubleClick,
    onOpenBacklinks,
    onToggleThreadFocus,
    className,
    style,
  }: PostCardProps) => {
    const { htmlMetas, imageMetas, twitterMetas } = usePostMetadata(
      message,
      enabledCardView,
    );

    const threadToggleLabel = isThreadFocused
      ? "スレッド表示を閉じる"
      : "スレッドを表示";
    const backlinkLabel = `被リンク ${backlinkCount}件`;
    const backlinkButtonLabel = `${backlinkLabel}をプレビュー`;

    const footerRightAddon =
      backlinkCount > 0 || showThreadIcon ? (
        <HStack className="items-center gap-[var(--size-2-2)]">
          {backlinkCount > 0 && (
            <Box
              aria-label={backlinkButtonLabel}
              className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[85%] transition-colors hover:bg-[var(--background-modifier-hover)]"
              ref={(ref: HTMLElement | null) => {
                // 意図: footer の数字だけでは意味が伝わりにくいので、
                // アイコンに触れた時点で参照数だと分かるようにする。
                ref && setTooltip(ref, backlinkButtonLabel);
              }}
              onClick={(e: React.MouseEvent<HTMLElement>) => {
                e.stopPropagation();
                onOpenBacklinks?.();
              }}
            >
              <ObsidianIcon
                aria-hidden="true"
                className="pointer-events-none px-0 py-0 hover:text-[var(--text-muted)]"
                name="link"
                size="0.95em"
              />
              <Box as="span" className="text-[75%] leading-none">
                {backlinkCount}
              </Box>
            </Box>
          )}

          {showThreadIcon && (
            <ObsidianIcon
              ref={(ref) => {
                ref && setTooltip(ref, threadToggleLabel);
              }}
              name="spool"
              aria-label={threadToggleLabel}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
                onToggleThreadFocus?.();
              }}
              size="1.1em"
            />
          )}
        </HStack>
      ) : undefined;

    return (
      <Card
        className={[className, isHighlighted ? "mfdi-card--highlighted" : ""]
          .filter(Boolean)
          .join(" ")}
        disableHoverBg={isHighlighted}
        style={style}
      >
        <CardContent
          timestamp={timestamp}
          granularity={granularity}
          dateFilter={dateFilter}
          isDimmed={isDimmed}
          onContextMenu={onContextMenu}
          onDoubleClick={() => !isDimmed && onDoubleClick?.()}
          footerAddon={
            tags.length > 0 ? (
              <HStack className="footer flex-wrap justify-end gap-[var(--size-2-3)]">
                {/* タグは一覧の識別子なので、視線の終点になる右下へまとめる。 */}
                {tags.map((tag) => (
                  <Tag
                    key={tag}
                    className="text-xs px-0 py-0.5 rounded-md bg-[var(--tag-bg)] text-[var(--tag-fg)]"
                  >
                    {tag}
                  </Tag>
                ))}
              </HStack>
            ) : undefined
          }
          footerRightAddon={footerRightAddon}
        >
          <ReadMoreContent text={message}>
            {(displayText, { isOverflowing, expanded }) => (
              <VStack
                className={cn(
                  "content-container flex-1 min-h-0",
                  isOverflowing && expanded && "overflow-y-auto",
                )}
                align="stretch"
                gap={3}
              >
                {/* Message Body */}
                <Box className="mfdi-message-body px-1 break-words">
                  <ObsidianMarkdown
                    content={displayText}
                    sourcePath={sourcePath}
                  />
                </Box>

                {enabledCardView && (
                  <Box className="px-1">
                    {htmlMetas.map((meta) => (
                      <HTMLCard key={meta.originUrl} meta={meta} />
                    ))}
                    {imageMetas.map((meta) => (
                      <ImageCard key={meta.originUrl} meta={meta} />
                    ))}
                    {twitterMetas.map((meta) => (
                      <TwitterCard key={meta.url} meta={meta} />
                    ))}
                  </Box>
                )}
              </VStack>
            )}
          </ReadMoreContent>
        </CardContent>
      </Card>
    );
  },
);

const usePostMetadata = (message: string, enabled: boolean) => {
  const [htmlMetas, setHtmlMetas] = useState<HTMLMeta[]>([]);
  const [imageMetas, setImageMetas] = useState<ImageMeta[]>([]);
  const [twitterMetas, setTwitterMetas] = useState<TwitterMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHtmlMetas([]);
      setImageMetas([]);
      setTwitterMetas([]);
      return;
    }

    let isMounted = true;

    (async function () {
      setIsLoading(true);
      const urls = pickUrls(message);
      const results = (await Promise.all(urls.map(createMeta))).filter(
        isPresent,
      );

      if (!isMounted) return;

      setHtmlMetas(
        results.filter((result): result is HTMLMeta => result.type === "html"),
      );
      setImageMetas(
        results.filter(
          (result): result is ImageMeta => result.type === "image",
        ),
      );
      setTwitterMetas(
        results.filter(
          (result): result is TwitterMeta => result.type === "twitter",
        ),
      );
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [message, enabled]);

  return { htmlMetas, imageMetas, twitterMetas, isLoading };
};
