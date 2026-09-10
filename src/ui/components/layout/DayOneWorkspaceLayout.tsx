import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MiniCalendar } from "src/ui/components/calendar/MiniCalendar";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { IconButton } from "src/ui/components/common/IconButton";
import { InViewComposer } from "src/ui/components/inputarea/InViewComposer";
import { PostCardView } from "src/ui/components/posts/PostCardView";
import { Box, Button, HStack, Input, Text, VStack } from "src/ui/components/primitives";
import { useAppContext } from "src/ui/context/AppContext";
import { useObsidianComponent } from "src/ui/context/ComponentContext";
import { useEditorRefs } from "src/ui/context/EditorRefsContext";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { usePostContextMenu } from "src/ui/hooks/internal/usePostContextMenu";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { usePosts } from "src/ui/hooks/usePosts";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { DateFilter, Granularity, Post } from "src/ui/types";
import type { MFDIView } from "src/ui/view/MFDIView";
import { getMFDIViewCapabilities } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

type DayOneTab = "entries" | "calendar";

type MonthGroup = {
  key: string;
  label: string;
  posts: Post[];
};

/**
 * A deliberately small archive-first shell inspired by Day One's journal
 * screen. The data, editor, and post actions all come from the existing MFDI
 * runtime; this component owns only the presentation and navigation chrome.
 */
export const DayOneWorkspaceLayout = () => {
  const { settings: pluginSettings } = useAppContext();
  const component = useObsidianComponent() as MFDIView;
  const { scrollContainerRef } = useEditorRefs();
  const searchRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<DayOneTab>("entries");

  const settings = useSettingsStore(
    useShallow((state) => ({
      date: state.date,
      dateFilter: state.dateFilter,
      granularity: state.granularity,
      isReadOnly: state.isReadOnly(),
      searchInputOpen: state.searchInputOpen,
      searchQuery: state.searchQuery,
      viewNoteMode: state.viewNoteMode,
      handleClickHome: state.handleClickHome,
      handleClickMoveNext: state.handleClickMoveNext,
      handleClickMovePrevious: state.handleClickMovePrevious,
      setDate: state.setDate,
      setDisplayMode: state.setDisplayMode,
      setSearchInputOpen: state.setSearchInputOpen,
      setSearchQuery: state.setSearchQuery,
    })),
  );
  const { filteredPosts, hasMore, isLoading, isValidating, loadMore } = usePosts();
  const composerOpen = useEditorStore((state) => state.composerOpen);
  const openComposer = useEditorStore((state) => state.openComposer);

  useEffect(() => {
    if (settings.searchInputOpen) {
      window.setTimeout(() => searchRef.current?.focus());
    }
  }, [settings.searchInputOpen]);

  useEffect(() => {
    const focusSearch = () => {
      settings.setSearchInputOpen(true);
      window.setTimeout(() => searchRef.current?.focus());
    };
    const closeSearch = () => settings.setSearchInputOpen(false);

    component.actionDelegates.onSearchInputOpen = focusSearch;
    component.actionDelegates.onSearchInputClose = closeSearch;
    return () => {
      component.actionDelegates.onSearchInputOpen = undefined;
      component.actionDelegates.onSearchInputClose = undefined;
    };
  }, [component, settings.setSearchInputOpen]);

  const handleOpenComposer = useCallback(() => {
    if (settings.isReadOnly) return;
    setActiveTab("entries");
    openComposer();
  }, [openComposer, settings.isReadOnly]);

  const handleCloseSearch = useCallback(() => {
    settings.setSearchInputOpen(false);
    searchRef.current?.blur();
  }, [settings.setSearchInputOpen]);

  const capabilities = useMemo(
    () => getMFDIViewCapabilities({ noteMode: settings.viewNoteMode }),
    [settings.viewNoteMode],
  );
  const { openEditorInNewWindow, showTextInput, confirmDeleteAction } = useObsidianUi();
  const {
    archivePost,
    copyBlockIdLink,
    createThread,
    deletePost,
    handleHighlightPost,
    handleHighlightSource,
    movePostToTomorrow,
    permanentlyDeletePost,
    setPostPinned,
    setPostTags,
  } = usePostActions();
  const startEdit = useEditorStore((state) => state.startEdit);
  const highlightedPost = useEditorStore((state) => state.highlightedPost);

  const handleStartEdit = useCallback(
    (post: Post) => {
      if (pluginSettings.openInNewWindowMode === "always") {
        openEditorInNewWindow(post);
        return;
      }
      startEdit(post);
    },
    [openEditorInNewWindow, pluginSettings.openInNewWindowMode, startEdit],
  );

  const { showPostContextMenu } = usePostContextMenu({
    isReadOnly: settings.isReadOnly,
    capabilities,
    archivePost,
    createThread,
    deletePost,
    permanentlyDeletePost,
    movePostToTomorrow,
    handleHighlightPost,
    handleHighlightSource,
    setDate: settings.setDate,
    setDisplayMode: settings.setDisplayMode,
    startEdit: handleStartEdit,
    openEditorInNewWindow,
    showTextInput,
    confirmDeleteAction,
    setPostTags,
    setPostPinned,
    copyBlockIdLink,
  });

  const monthGroups = useMemo(() => groupPostsByMonth(filteredPosts), [filteredPosts]);

  if (composerOpen) {
    return <InViewComposer />;
  }

  return (
    <Box className="dayone-root">
      <DayOneHeader
        date={settings.date}
        searchInputOpen={settings.searchInputOpen}
        searchQuery={settings.searchQuery}
        filteredPostCount={filteredPosts.length}
        onPrevious={settings.handleClickMovePrevious}
        onNext={settings.handleClickMoveNext}
        onHome={() => {
          settings.handleClickHome();
          setActiveTab("entries");
        }}
        onToggleSearch={() => {
          if (settings.searchInputOpen) {
            handleCloseSearch();
            return;
          }
          settings.setSearchInputOpen(true);
        }}
        onCloseSearch={handleCloseSearch}
        onSearchQueryChange={settings.setSearchQuery}
        searchRef={searchRef}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <Box className="dayone-scroll" ref={scrollContainerRef} aria-busy={isValidating}>
        {activeTab === "calendar" ? (
          <DayOneCalendarView />
        ) : (
          <DayOneEntryList
            groups={monthGroups}
            filteredPostCount={filteredPosts.length}
            hasMore={hasMore}
            isLoading={isLoading}
            isReadOnly={settings.isReadOnly}
            searchQuery={settings.searchQuery}
            highlightedPost={highlightedPost}
            onLoadMore={loadMore}
            onEdit={handleStartEdit}
            onContextMenu={showPostContextMenu}
            enabledCardView={pluginSettings.enabledCardView}
            allowEditingPastNotes={pluginSettings.allowEditingPastNotes}
            granularity={settings.granularity}
            dateFilter={settings.dateFilter}
            onWrite={handleOpenComposer}
          />
        )}
      </Box>

      <Box className="dayone-composer-dock">
        <Button
          variant="accent"
          className="dayone-new-entry-button"
          disabled={settings.isReadOnly}
          onClick={handleOpenComposer}
        >
          <ObsidianIcon
            name="pencil"
            size="1em"
            className="pointer-events-none text-[var(--text-on-accent)] hover:text-[var(--text-on-accent)]"
          />
          新しいエントリー
        </Button>
      </Box>
    </Box>
  );
};

function groupPostsByMonth(posts: Post[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  const groupsByKey = new Map<string, MonthGroup>();

  for (const post of posts) {
    const key = post.timestamp.format("YYYY-MM");
    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        key,
        label: post.timestamp.format("YYYY年M月"),
        posts: [],
      };
      groupsByKey.set(key, group);
      groups.push(group);
    }
    group.posts.push(post);
  }

  return groups;
}

function DayOneHeader({
  date,
  searchInputOpen,
  searchQuery,
  filteredPostCount,
  onPrevious,
  onNext,
  onHome,
  onToggleSearch,
  onCloseSearch,
  onSearchQueryChange,
  searchRef,
  activeTab,
  onTabChange,
}: {
  date: moment.Moment;
  searchInputOpen: boolean;
  searchQuery: string;
  filteredPostCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onHome: () => void;
  onToggleSearch: () => void;
  onCloseSearch: () => void;
  onSearchQueryChange: (query: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  activeTab: DayOneTab;
  onTabChange: (tab: DayOneTab) => void;
}) {
  return (
    <Box as="header" className="dayone-header">
      <HStack className="dayone-header__top" justify="between">
        <HStack className="dayone-header__identity" gap="0.7rem">
          <Box className="dayone-header__mark">
            <ObsidianIcon
              name="book-open"
              size="1.35em"
              className="pointer-events-none text-[var(--text-on-accent)] hover:text-[var(--text-on-accent)]"
            />
          </Box>
          <VStack className="items-start gap-0">
            <Text as="h1" className="dayone-header__title">
              Daily Journal
            </Text>
            <Text className="dayone-header__date">{date.format("YYYY年M月D日 dddd")}</Text>
          </VStack>
        </HStack>

        <HStack className="dayone-header__actions" gap="0.25rem">
          {/* Keep explicit labels so the controls remain understandable to keyboard and screen-reader users. */}
          <IconButton
            name="chevron-left"
            ariaLabel="前の日付"
            onActivate={onPrevious}
            className="dayone-header__icon-button"
          />
          <IconButton
            name="chevron-right"
            ariaLabel="次の日付"
            onActivate={onNext}
            className="dayone-header__icon-button"
          />
          <IconButton
            name="search"
            ariaLabel="検索"
            onActivate={onToggleSearch}
            className="dayone-header__icon-button"
          />
          <Button className="dayone-today-button" variant="ghost" onClick={onHome}>
            Today
          </Button>
        </HStack>
      </HStack>

      {searchInputOpen && (
        <HStack className="dayone-search" gap="0.4rem">
          <ObsidianIcon
            name="search"
            size="1em"
            className="pointer-events-none cursor-default p-0 text-[var(--text-on-accent)] hover:text-[var(--text-on-accent)]"
          />
          <Input
            ref={searchRef}
            type="search"
            value={searchQuery}
            placeholder="エントリーを検索"
            aria-label="エントリーを検索"
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              onCloseSearch();
            }}
          />
          <IconButton
            name="x"
            ariaLabel="検索を閉じる"
            onActivate={onCloseSearch}
            className="dayone-header__icon-button"
          />
        </HStack>
      )}

      <HStack as="nav" className="dayone-tabs" gap="0.25rem" aria-label="ジャーナル表示">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "entries"}
          className={activeTab === "entries" ? "dayone-tabs__tab is-active" : "dayone-tabs__tab"}
          onClick={() => onTabChange("entries")}
        >
          <ObsidianIcon name="list" size="1em" aria-hidden="true" />
          エントリー
          <span className="dayone-tabs__count">{filteredPostCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "calendar"}
          className={activeTab === "calendar" ? "dayone-tabs__tab is-active" : "dayone-tabs__tab"}
          onClick={() => onTabChange("calendar")}
        >
          <ObsidianIcon name="calendar-days" size="1em" aria-hidden="true" />
          カレンダー
        </button>
      </HStack>
    </Box>
  );
}

function DayOneEntryList({
  groups,
  filteredPostCount,
  hasMore,
  isLoading,
  isReadOnly,
  searchQuery,
  highlightedPost,
  onLoadMore,
  onEdit,
  onContextMenu,
  enabledCardView,
  allowEditingPastNotes,
  granularity,
  dateFilter,
  onWrite,
}: {
  groups: MonthGroup[];
  filteredPostCount: number;
  hasMore: boolean;
  isLoading: boolean;
  isReadOnly: boolean;
  searchQuery: string;
  highlightedPost: Post | null;
  onLoadMore: () => void;
  onEdit: (post: Post) => void;
  onContextMenu: (post: Post, event: React.MouseEvent) => void;
  enabledCardView?: boolean;
  allowEditingPastNotes?: boolean;
  granularity: Granularity;
  dateFilter: DateFilter;
  onWrite: () => void;
}) {
  if (isLoading && filteredPostCount === 0) {
    return (
      <Box className="dayone-status" role="status">
        <ObsidianIcon name="loader-circle" size="1.4em" className="dayone-status__spinner" />
        エントリーを読み込み中…
      </Box>
    );
  }

  if (groups.length === 0) {
    return (
      <Box className="dayone-empty">
        <ObsidianIcon name="book-open" size="2.2em" className="dayone-empty__icon" />
        <Text as="h2">まだエントリーがありません</Text>
        <Text as="p">
          {searchQuery
            ? "検索条件に一致する記録がありません。"
            : "今日のことを、短くてもいいので残してみるっす。"}
        </Text>
        {!searchQuery && (
          <Button variant="accent" disabled={isReadOnly} onClick={onWrite}>
            最初のエントリーを書く
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box className="dayone-content">
      <HStack className="dayone-list-intro" justify="between">
        <Text className="dayone-list-intro__label">
          {searchQuery ? `「${searchQuery}」の検索結果` : "すべてのエントリー"}
        </Text>
        <Text className="dayone-list-intro__count">{filteredPostCount}件</Text>
      </HStack>

      {groups.map((group) => (
        <Box as="section" className="dayone-month" key={group.key}>
          <HStack className="dayone-month__heading" justify="between">
            <Text as="h2">{group.label}</Text>
            <Text>{group.posts.length}件</Text>
          </HStack>
          <VStack className="dayone-entry-list" align="stretch" gap="0">
            {group.posts.map((post) => (
              <DayOneEntryRow
                key={post.id}
                post={post}
                granularity={granularity}
                dateFilter={dateFilter}
                isHighlighted={highlightedPost?.id === post.id}
                enabledCardView={enabledCardView}
                allowEditingPastNotes={allowEditingPastNotes}
                onEdit={onEdit}
                onContextMenu={onContextMenu}
              />
            ))}
          </VStack>
        </Box>
      ))}

      <Box className="dayone-load-more">
        {hasMore ? (
          <Button variant="ghost" onClick={onLoadMore}>
            さらに読み込む
          </Button>
        ) : (
          <Text>ここまでのエントリーを表示しています</Text>
        )}
      </Box>
    </Box>
  );
}

function DayOneEntryRow({
  post,
  granularity,
  dateFilter,
  isHighlighted,
  enabledCardView,
  allowEditingPastNotes,
  onEdit,
  onContextMenu,
}: {
  post: Post;
  granularity: Granularity;
  dateFilter: DateFilter;
  isHighlighted: boolean;
  enabledCardView?: boolean;
  allowEditingPastNotes?: boolean;
  onEdit: (post: Post) => void;
  onContextMenu: (post: Post, event: React.MouseEvent) => void;
}) {
  return (
    <Box as="article" className="dayone-entry-row">
      <Box className="dayone-entry-date" aria-label={post.timestamp.format("YYYY年M月D日 HH:mm")}>
        <Text className="dayone-entry-date__day">{post.timestamp.format("D")}</Text>
        <Text className="dayone-entry-date__month">{post.timestamp.format("ddd")}</Text>
        <Text as="time" className="dayone-entry-date__time">
          {post.timestamp.format("HH:mm")}
        </Text>
      </Box>
      <PostCardView
        post={post}
        granularity={granularity}
        dateFilter={dateFilter}
        isHighlighted={isHighlighted}
        enabledCardView={enabledCardView}
        allowEditingPastNotes={allowEditingPastNotes}
        onEdit={onEdit}
        onContextMenu={onContextMenu}
        className="dayone-entry-row__post"
      />
    </Box>
  );
}

function DayOneCalendarView() {
  return (
    <Box className="dayone-content dayone-calendar-view">
      <Box className="dayone-calendar-card">
        <HStack className="dayone-calendar-card__heading" justify="between">
          <VStack className="items-start gap-0">
            <Text as="h2">カレンダー</Text>
            <Text>記録のある日にはマークが付きます</Text>
          </VStack>
          <ObsidianIcon name="calendar-days" size="1.4em" className="dayone-calendar-card__icon" />
        </HStack>
        <MiniCalendar />
      </Box>
    </Box>
  );
}
