import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ObsidianIcon } from "src/core/ui/components/common/ObsidianIcon";
import { DateDivider } from "src/features/posts/components/posts/DateDivider";
import { PostCardView } from "src/features/posts/components/posts/PostCardView";
import { Box } from "src/core/ui/components/primitives/Box";
import { FloatingButton } from "src/core/ui/components/primitives/FloatingButton";
import { cn } from "src/core/ui/components/primitives/utils";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useEditorRefs } from "src/features/composer/context/EditorRefsContext";
import { useDividerContextMenu } from "src/features/posts/hooks/internal/useDividerContextMenu";
import { usePostMutations } from "src/features/posts/hooks/internal/usePostMutations";
import { usePostContextMenu } from "src/features/posts/hooks/internal/usePostContextMenu";
import { useObsidianUi } from "src/features/workspace/hooks/useObsidianUi";
import { usePostBacklinks } from "src/features/posts/hooks/usePostBacklinkCounts";
import { usePosts } from "src/features/posts/hooks/usePosts";
import { useEditorStore } from "src/features/composer/store/editorStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { Post } from "src/core/domain/post";
import { isPinned } from "src/core/domain/post-metadata";
import { reportError } from "src/core/error-report";
import { getDSTRViewCapabilities } from "src/features/workspace/views/state";
import { Virtualizer, type VirtualizerHandle } from "virtua";
import { useShallow } from "zustand/shallow";

function isSamePostReference(left: Post, right: Post): boolean {
  return (
    left.id === right.id ||
    (left.path === right.path &&
      left.timestamp.valueOf() === right.timestamp.valueOf() &&
      left.message.trim() === right.message.trim())
  );
}

export const PostListView = memo(() => {
  const { shell, settings: pluginSettings } = useAppContext();
  const { showTextInput, confirmDeleteAction, openBacklinkPreview } = useObsidianUi();
  const settings = useSettingsStore(
    useShallow((s) => ({
      activeTag: s.activeTag,
      granularity: s.granularity,
      dateFilter: s.dateFilter,
      rightPanelOpen: s.rightPanelOpen ?? s.sidebarOpen,
      setDate: s.setDate,
      setDisplayMode: s.setDisplayMode,
      setThreadFocusRootId: s.setThreadFocusRootId,
      asTask: s.asTask,
      isReadOnly: s.isReadOnly(),
      timeFilter: s.timeFilter,
      threadFocusRootId: s.threadFocusRootId,
      viewNoteMode: s.viewNoteMode,
      inputAreaSize: s.inputAreaSize,
    })),
  );

  const {
    editingPostOffset,
    editingPost,
    highlightedPost,
    highlightRequestId,
    startEdit,
    setEditingPost,
  } = useEditorStore(
    useShallow((s) => ({
      editingPostOffset: s.editingPostOffset,
      editingPost: s.editingPost,
      highlightedPost: s.highlightedPost,
      highlightRequestId: s.highlightRequestId,
      startEdit: s.startEdit,
      setEditingPost: s.setEditingPost,
    })),
  );

  const { scrollContainerRef, listHeaderRef } = useEditorRefs();
  const [listHeaderHeight, setListHeaderHeight] = useState(0);

  useEffect(() => {
    const el = listHeaderRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setListHeaderHeight(el.offsetHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [listHeaderRef]);

  // 意図: 一覧操作だけを購読し、ここで使わない投稿確定用のエディタ状態を購読しない。
  const {
    handleHighlightPost,
    handleHighlightSource,
    deletePost,
    permanentlyDeletePost,
    movePostToTomorrow,
    archivePost,
    createThread,
    setPostTags,
    setPostPinned,
    copyBlockIdLink,
  } = usePostMutations();

  const {
    granularity,
    dateFilter,
    isReadOnly,
    setDate,
    setDisplayMode,
    threadFocusRootId,
    setThreadFocusRootId,
  } = settings;

  const {
    posts,
    filteredPosts,
    loadMore,
    hasMore,
    isLoading,
    timelineView,
    threadView,
    canCollapseDividers,
    collapsedGroupSet,
    toggleCollapsedGroup,
    collapseGroups,
    expandGroups,
    timelineItems,
    visibleDividerGroupKeys,
  } = usePosts();
  const showGranularityBadges = useMemo(() => {
    const noteGranularities = new Set(filteredPosts.map((post) => post.noteGranularity));
    return noteGranularities.has("day") && noteGranularities.has("month");
  }, [filteredPosts]);

  const { countMap: backlinkCounts, postsMap: backlinkPosts } = usePostBacklinks(filteredPosts);

  const capabilities = useMemo(
    () => getDSTRViewCapabilities({ noteMode: settings.viewNoteMode }),
    [settings.viewNoteMode],
  );

  const hasVisibleDividers = visibleDividerGroupKeys.length > 0;
  const areAllVisibleDividersCollapsed =
    hasVisibleDividers && visibleDividerGroupKeys.every((k) => collapsedGroupSet.has(k));
  const areAllVisibleDividersExpanded =
    hasVisibleDividers && visibleDividerGroupKeys.every((k) => !collapsedGroupSet.has(k));

  const collapseAll = useCallback(
    () => collapseGroups(visibleDividerGroupKeys),
    [collapseGroups, visibleDividerGroupKeys],
  );
  const expandAll = useCallback(
    () => expandGroups(visibleDividerGroupKeys),
    [expandGroups, visibleDividerGroupKeys],
  );

  const openBacklinkPreviewForPost = useCallback(
    (post: Post) => {
      const sourcePosts = backlinkPosts.get(post.id) ?? [];
      if (sourcePosts.length === 0) return;

      // 意図: exact jump は既存の投稿ジャンプロジックに一本化して、
      // modal 側で別の移動実装を持たないようにする。
      openBacklinkPreview({
        targetPost: post,
        sourcePosts,
        onSelectPost: (sourcePost) => {
          void handleHighlightPost(sourcePost).catch((error: unknown) =>
            reportError({ context: "Failed to jump to a backlink source post", error }),
          );
        },
      });
    },
    [backlinkPosts, openBacklinkPreview, handleHighlightPost],
  );

  const { openEditorInNewWindow } = useObsidianUi();

  const { inputAreaSize } = useSettingsStore(
    useShallow((s) => ({ inputAreaSize: s.inputAreaSize })),
  );

  // 意図: openInNewWindowMode の設定に応じて編集をポップアウトへ転送する。
  // startEdit を直接渡すと設定変更が反映されないため、ここでラップする。
  const handleStartEdit = useCallback(
    (post: Post) => {
      const mode = pluginSettings?.openInNewWindowMode ?? "disabled";
      const shouldPopout = mode === "always";

      if (shouldPopout) {
        openEditorInNewWindow(post);
        return;
      }
      startEdit(post);
    },
    [pluginSettings, inputAreaSize, openEditorInNewWindow, startEdit],
  );

  const { showPostContextMenu } = usePostContextMenu({
    isReadOnly,
    capabilities,
    archivePost,
    createThread,
    deletePost,
    permanentlyDeletePost,
    movePostToTomorrow,
    handleHighlightPost,
    handleHighlightSource,
    setDate,
    setDisplayMode,
    startEdit: handleStartEdit,
    openEditorInNewWindow,
    showTextInput,
    confirmDeleteAction,
    setPostTags,
    setPostPinned,
    copyBlockIdLink,
  });

  const { showDividerContextMenu } = useDividerContextMenu({
    canCollapseDividers,
    areAllVisibleDividersCollapsed,
    areAllVisibleDividersExpanded,
    hasVisibleDividers,
    collapseAll,
    expandAll,
  });

  const vRef = useRef<VirtualizerHandle>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollToTop = useCallback(() => {
    // InputArea/StatusBar がスクロールエリア内にあるため、先頭アイテムではなく top:0 に戻す
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [scrollContainerRef]);

  // 編集中のポストを現在のリストから再特定する
  // オフセットがズレている可能性があるので、IDなどで再特定して同期する
  useEffect(() => {
    if (editingPostOffset === null) return;
    if (editingPost && editingPost.startOffset === editingPostOffset) return;

    const realPost = posts.find((p) => p.startOffset === editingPostOffset);
    if (realPost) {
      setEditingPost(realPost);
    }
  }, [posts, editingPostOffset, editingPost, setEditingPost]);

  useEffect(() => {
    shell.on("dstr:scroll-to-top", scrollToTop);
    return () => {
      shell.off("dstr:scroll-to-top", scrollToTop);
    };
  }, []);

  useEffect(() => {
    if (!highlightedPost) return;

    const targetIndex = timelineItems.findIndex(
      (item) => item.type === "post" && isSamePostReference(item.post, highlightedPost),
    );
    if (targetIndex === -1) return;

    const timer = window.setTimeout(() => {
      vRef.current?.scrollToIndex(targetIndex, { align: "center" });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [timelineItems, highlightedPost, highlightRequestId]);

  // 無限スクロールのトリガー (初期読み込みなどでリストが空の場合のケア)
  useEffect(() => {
    if (threadView) return;
    if (!timelineView || !hasMore) return;

    if (timelineItems.length === 0) {
      loadMore();
    }
  }, [timelineView, hasMore, loadMore, timelineItems.length, threadView]);

  const pinnedPostCount = useMemo(
    () => filteredPosts.filter((post) => isPinned(post.metadata)).length,
    [filteredPosts],
  );

  return (
    <Box className="list w-full relative">
      <Virtualizer
        ref={vRef}
        scrollRef={scrollContainerRef}
        startMargin={listHeaderHeight}
        onScroll={(offset) => setShowScrollTop(offset > 200)}
      >
        {timelineItems.map((item) => {
          if (item.type === "pinned-divider") {
            return (
              <Box key={item.key} style={{ paddingBottom: "1px" }}>
                <DateDivider
                  label="ピン留め"
                  leadingIconName="pin"
                  count={pinnedPostCount}
                  collapsed={item.collapsed}
                  showCollapseIcon={canCollapseDividers}
                  onClick={
                    canCollapseDividers ? () => toggleCollapsedGroup(item.groupKey) : undefined
                  }
                  onContextMenu={(event) => showDividerContextMenu(event)}
                />
              </Box>
            );
          }

          // item.type === "post"
          const isEditing =
            editingPost != null
              ? isSamePostReference(item.post, editingPost)
              : editingPostOffset !== null && item.post.startOffset === editingPostOffset;
          const isJumpHighlighted =
            highlightedPost != null && isSamePostReference(item.post, highlightedPost);

          return (
            <Box key={item.key} className="dstr-post-row">
              <PostCardView
                post={item.post}
                showGranularityBadge={showGranularityBadges}
                backlinkCount={backlinkCounts.get(item.post.id) ?? 0}
                granularity={granularity}
                dateFilter={dateFilter}
                isHighlighted={isEditing || isJumpHighlighted}
                onEdit={handleStartEdit}
                onOpenBacklinks={openBacklinkPreviewForPost}
                onContextMenu={showPostContextMenu}
                isThreadFocused={item.post.id === threadFocusRootId}
                onToggleThreadFocus={(post) => {
                  setThreadFocusRootId(
                    threadFocusRootId === post.id ? null : post.id,
                    post.noteDate,
                  );
                }}
                enabledCardView={pluginSettings?.enabledCardView}
                allowEditingPastNotes={pluginSettings?.allowEditingPastNotes}
              />
            </Box>
          );
        })}
        {timelineView && !threadView && (
          <ListFooter key="footer" hasMore={!!hasMore} isLoading={isLoading} loadMore={loadMore} />
        )}
        <Box key="bottom-spacer" className="h-[24rem]" />
      </Virtualizer>
      <FloatingButton
        tooltip="先頭へ戻る"
        className={cn(
          "up-button fixed bottom-[calc(2rem+34px+8px)]",
          settings.rightPanelOpen && capabilities.supportsSidebar
            ? "right-[calc(8px+300px)]"
            : "right-8",
        )}
        onClick={() => shell.trigger("dstr:scroll-to-top")}
        visible={showScrollTop}
      >
        <ObsidianIcon
          className="text-[var(--text-on-accent)] hover:text-[var(--text-on-accent)]"
          name="chevron-up"
          size="1.2em"
        />
      </FloatingButton>
    </Box>
  );
});

const ListFooter = memo(
  ({
    hasMore,
    isLoading,
    loadMore,
  }: {
    hasMore: boolean;
    isLoading: boolean;
    loadMore: () => void;
  }) => {
    useEffect(() => {
      if (hasMore) {
        loadMore();
      }
    }, [hasMore, loadMore]);

    return (
      <Box className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-[var(--font-smallest)]">
        {isLoading || hasMore ? "読み込み中..." : "これ以上投稿はありません"}
      </Box>
    );
  },
);
