import React from "react";
import { PostCard } from "src/features/posts/components/posts/PostCard";
import { isPastDateReadOnly } from "src/features/workspace/store/slices/settingsSlice";
import type { Granularity } from "src/core/domain/granularity";
import type { Post } from "src/core/domain/post";
import type { DateFilter } from "src/features/workspace/types";
import { getPostTags } from "src/core/domain/post-metadata";
import { isThreadRoot } from "src/features/posts/utils/thread-utils";

/**
 * Post オブジェクトから派生値を計算して PostCard に委譲するラッパー。
 * MFDI のストア型に依存するロジックはここに集約し、
 * PostCard 自体は Post 型を知らない純粋な見た目コンポーネントとして保つ。
 */
export const PostCardView = React.memo(
  ({
    post,
    showGranularityBadge = false,
    backlinkCount = 0,
    granularity,
    dateFilter,
    onContextMenu,
    onEdit,
    onOpenBacklinks,
    isHighlighted = false,
    isThreadFocused = false,
    onToggleThreadFocus,
    className,
    style,
    // MFDI ストアへの依存を排除し、Paper Cut などの他プラグインからも再利用できるようにする
    enabledCardView,
    allowEditingPastNotes,
  }: {
    post: Post;
    showGranularityBadge?: boolean;
    backlinkCount?: number;
    granularity: Granularity;
    dateFilter?: DateFilter;
    onContextMenu?: (post: Post, e: React.MouseEvent) => void;
    onEdit?: (post: Post) => void;
    onOpenBacklinks?: (post: Post) => void;
    isHighlighted?: boolean;
    isThreadFocused?: boolean;
    onToggleThreadFocus?: (post: Post) => void;
    className?: string;
    style?: React.CSSProperties;
    enabledCardView?: boolean;
    allowEditingPastNotes?: boolean;
  }) => {
    const isDimmed = isPastDateReadOnly({
      date: post.noteDate,
      granularity,
      allowEditingPastNotes: allowEditingPastNotes ?? false,
    });

    return (
      <PostCard
        message={post.message}
        sourcePath={post.path}
        timestamp={post.timestamp}
        noteGranularity={post.noteGranularity}
        showGranularityBadge={showGranularityBadge}
        granularity={granularity}
        dateFilter={dateFilter}
        isDimmed={isDimmed}
        tags={getPostTags(post.metadata)}
        backlinkCount={backlinkCount}
        showThreadIcon={isThreadRoot(post)}
        isThreadFocused={isThreadFocused}
        isHighlighted={isHighlighted}
        enabledCardView={enabledCardView}
        onContextMenu={(e) => onContextMenu?.(post, e)}
        onDoubleClick={() => onEdit?.(post)}
        onOpenBacklinks={() => onOpenBacklinks?.(post)}
        onToggleThreadFocus={() => onToggleThreadFocus?.(post)}
        className={className}
        style={style}
      />
    );
  },
);
