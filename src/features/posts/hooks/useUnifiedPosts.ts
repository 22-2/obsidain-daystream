import { useMemo } from "react";
import { useFocusPosts } from "src/features/posts/hooks/internal/useFocusPosts";
import { useInfiniteTimeline } from "src/features/posts/hooks/internal/useInfiniteTimeline";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { DisplayMode } from "src/features/workspace/types";
import { isTimelineView } from "src/features/workspace/utils/view-mode";
import type { DSTRNoteMode } from "src/features/workspace/views/state";
import { useShallow } from "zustand/shallow";

export function shouldUseTimelineView(params: {
  displayMode: DisplayMode;
  viewNoteMode: DSTRNoteMode;
}): boolean {
  const { displayMode, viewNoteMode } = params;
  // fixedノートでは常に単一ノートの一覧を表示したいため、
  // 永続化済みの displayMode が timeline でも focus系取得へ固定する。
  return viewNoteMode !== "fixed" && isTimelineView(displayMode);
}

/**
 * タイムラインモードとフォーカスモードの両方を抽象化した、
 * 統合的なデータ取得Hook。
 */
export const useUnifiedPosts = () => {
  const { displayMode, viewNoteMode } = useSettingsStore(
    useShallow((s) => ({
      displayMode: s.displayMode,
      viewNoteMode: s.viewNoteMode,
    })),
  );

  const timelineView = shouldUseTimelineView({ displayMode, viewNoteMode });

  // 両方のフックを呼ぶが、SWR内部で不必要なフェッチは行われない（key=nullになれば）
  const infinity = useInfiniteTimeline();
  const focus = useFocusPosts();

  return useMemo(() => {
    if (timelineView) {
      return {
        posts: infinity.allPosts,
        loadMore: infinity.loadMore,
        hasMore: infinity.hasMore,
        isLoading: infinity.isLoading,
        isValidating: infinity.isValidating,
      };
    } else {
      return {
        posts: focus.posts,
        // 意図: フォーカス系のページングは取得結果を切り出す PostsProvider 側で行う。
        loadMore: () => {},
        hasMore: false,
        isLoading: focus.isLoading,
        isValidating: focus.isValidating,
      };
    }
  }, [
    timelineView,
    infinity.allPosts,
    infinity.loadMore,
    infinity.hasMore,
    infinity.isLoading,
    infinity.isValidating,
    focus.posts,
    focus.isLoading,
    focus.isValidating,
  ]);
};
