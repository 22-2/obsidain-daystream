import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { ObsidianIcon } from "src/core/ui/components/common/ObsidianIcon";
import { reportError } from "src/core/error-report";
import { EmptyState } from "src/features/workspace/components/EmptyState";
import { InputArea } from "src/features/composer/components/inputarea/InputArea";
import { InsightView } from "src/features/insights/components/InsightView";
import { FixedSessionSidebar } from "src/features/notes/components/FixedSessionSidebar";
import { InsightsSidebar } from "src/features/insights/components/InsightsSidebar";
import { MainViewTabs } from "src/features/workspace/components/layout/MainViewTabs";
import { PeriodicSidebar } from "src/features/notes/components/PeriodicSidebar";
import { SidebarContainer } from "src/features/workspace/components/layout/SidebarContainer";
import { useSidebarAutoToggle } from "src/features/workspace/hooks/internal/useSidebarAutoToggle";
import { PostListView } from "src/features/posts/components/posts/PostListView";
import { Flex, Spinner } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";
import { SearchControls } from "src/features/posts/components/search/SearchControls";
import { StatusBar } from "src/features/workspace/components/statusbar/StatusBar";
import { PastTodayNotice } from "src/features/workspace/components/statusbar/parts/PastTodayNotice";
import { TaskListView } from "src/features/tasks/components/tasks/TaskListView";
import { INPUT_AREA_SIZE, MAIN_VIEW } from "src/features/workspace/config/constants";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useEditorRefs } from "src/features/composer/context/EditorRefsContext";
import { useCSSLoaded } from "src/core/ui/hooks/useCSSLoaded";
import { usePosts } from "src/features/posts/hooks/usePosts";
import { useObsidianTooltip } from "src/core/ui/hooks/useObsidianTooltip";
import { useAppStore } from "src/features/workspace/store/appStore";
import { useNoteStore } from "src/features/notes/store/noteStore";
import { useTasksStore } from "src/features/tasks/store/tasksStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { Post } from "src/core/domain/post";
import { isTimelineView } from "src/features/workspace/utils/view-mode";
import { useDSTRView } from "src/features/workspace/views/useDSTRView";
import { getDSTRViewCapabilities } from "src/features/workspace/views/state";
import { useShallow } from "zustand/shallow";

export const DSTRWorkspaceLayout = () => {
  const { settings: pluginSettings } = useAppContext();
  const component = useDSTRView();
  const isCSSLoaded = useCSSLoaded(component.containerEl);
  const { viewNoteMode } = useAppStore(
    useShallow((s) => ({
      viewNoteMode: s.viewNoteMode,
    })),
  );
  const capabilities = useMemo(
    () => getDSTRViewCapabilities({ noteMode: viewNoteMode }),
    [viewNoteMode],
  );
  const settings = useSettingsStore(
    useShallow((s) => ({
      activeTag: s.activeTag,
      granularity: s.granularity,
      asTask: s.asTask,
      threadOnly: s.threadOnly,
      setSidebarOpen: s.setSidebarOpen,
      leftPanelOpen: s.leftPanelOpen,
      rightPanelOpen: s.rightPanelOpen,
      timeFilter: s.timeFilter,
      displayMode: s.displayMode,
      threadFocusRootId: s.threadFocusRootId,
      inputAreaSize: s.inputAreaSize,
      mainView: s.mainView,
      searchReturnState: s.searchReturnState,
      setMainView: s.setMainView,
      closeSearch: s.closeSearch,
      setSearchInputOpen: s.setSearchInputOpen,
      handleClickHome: s.handleClickHome,
    })),
  );
  const { handleClickHome } = settings;

  const { filteredPosts, filteredPostsWithThreadReplies } = usePosts();
  const { tasks } = useTasksStore(useShallow((s) => ({ tasks: s.tasks })));

  const { currentDailyNote } = useNoteStore(
    useShallow((s) => ({
      currentDailyNote: s.currentDailyNote,
    })),
  );

  const { scrollContainerRef, listHeaderRef } = useEditorRefs();
  useEffect(() => {
    component.actionDelegates.onClickHome = handleClickHome;

    return () => {
      component.actionDelegates.onClickHome = undefined;
    };
  }, [component, handleClickHome]);

  useEffect(() => {
    component.actionDelegates.onCopyAllPosts = () => {
      // スレッド表示中は返信も含めて全メッセージをコピー
      const postsTocopy: Post[] =
        settings.threadFocusRootId && settings.displayMode === "focus"
          ? filteredPostsWithThreadReplies.toReversed()
          : filteredPosts;
      const text = postsTocopy
        .map((p) => `${p.timestamp.format("YYYY-MM-DD HH:mm")}\n${p.message}`)
        .join("\n\n");
      navigator.clipboard.writeText(text).catch((error: unknown) => {
        reportError({ context: "Failed to copy posts", error, notice: "投稿をコピーできませんでした" });
      });
    };
    return () => {
      component.actionDelegates.onCopyAllPosts = undefined;
    };
  }, [
    component,
    filteredPosts,
    filteredPostsWithThreadReplies,
    settings.threadFocusRootId,
    settings.displayMode,
  ]);

  const {
    granularity,
    asTask,
    setSidebarOpen,
    leftPanelOpen,
    rightPanelOpen,
    mainView,
    setMainView,
    setSearchInputOpen,
    closeSearch,
  } = settings;
  const searchPanelId = useId();
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchTooltipRef = useObsidianTooltip("全体検索 (Ctrl+F)");
  const isSearchOpen = mainView === MAIN_VIEW.SEARCH;
  const closeSearchPanel = useCallback(() => {
    closeSearch();
    // 意図: Esc と閉じるボタンで検索欄を外した後、常設の検索入口へキーボード操作を戻す。
    searchButtonRef.current?.focus();
  }, [closeSearch]);

  const containerRef = useRef<HTMLDivElement>(null);
  useSidebarAutoToggle(containerRef, pluginSettings.autoToggleSidebar, setSidebarOpen);
  const contentScrollPositionsRef = useRef<Partial<Record<string, number>>>({});

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const savePosition = () => {
      contentScrollPositionsRef.current[mainView] = scrollContainer.scrollTop;
    };

    scrollContainer.addEventListener("scroll", savePosition, {
      passive: true,
    });
    scrollContainer.scrollTo({
      top: contentScrollPositionsRef.current[mainView] ?? 0,
    });

    return () => {
      savePosition();
      scrollContainer.removeEventListener("scroll", savePosition);
    };
  }, [mainView, scrollContainerRef]);

  useEffect(() => {
    // 意図: どのタブでも Ctrl+F から全体検索パネルを開き、入力欄へフォーカスする。
    component.actionDelegates.onSearchInputOpen = () => {
      setMainView(MAIN_VIEW.SEARCH);
      setSearchInputOpen(true);
    };
    component.actionDelegates.onSearchInputClose = closeSearchPanel;
    return () => {
      component.actionDelegates.onSearchInputOpen = undefined;
      component.actionDelegates.onSearchInputClose = undefined;
    };
  }, [component, setMainView, setSearchInputOpen, closeSearchPanel]);

  const isEditorMaximized = settings.inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED;
  // 意図: 最大化したエディタの作業領域を確保するため、左右のサイドバーを同時に閉じる。
  const effectivelyLeftOpen = leftPanelOpen && capabilities.supportsSidebar && !isEditorMaximized;
  const effectivelyRightOpen = rightPanelOpen && capabilities.supportsSidebar && !isEditorMaximized;

  const isEmpty =
    !isTimelineView(settings.displayMode) &&
    // 意図: 月表示は月次ノートがなくても日次ノートの投稿を集約するため、
    // 投稿一覧の空判定は取得済み投稿を正とし、現在ノートの有無だけで隠さない。
    (asTask ? !currentDailyNote || tasks.length === 0 : filteredPosts.length === 0);

  const content = useMemo(() => {
    if (!isCSSLoaded) {
      return;
    }

    if (mainView === MAIN_VIEW.INSIGHTS) {
      return <InsightView />;
    }

    return isEmpty ? (
      <EmptyState granularity={granularity} />
    ) : mainView === MAIN_VIEW.TASKS ? (
      <TaskListView />
    ) : (
      <PostListView />
    );
  }, [granularity, isCSSLoaded, isEmpty, mainView]);

  return (
    <Flex
      className="root dstr-dashboard-root h-full w-full overflow-hidden relative px-[var(--size-4-2)] py-[var(--size-4-2)]"
      ref={containerRef}
    >
      {/* Left Sidebar: calendar, tags, and period navigation */}
      {capabilities.supportsSidebar && (
        <SidebarContainer isOpen={effectivelyLeftOpen} side="left">
          {viewNoteMode === "fixed" ? <FixedSessionSidebar /> : <PeriodicSidebar />}
        </SidebarContainer>
      )}

      {/* Main Content */}
      <Flex
        className={cn(
          "dstr-dashboard-main max-content min-w-0 flex-col h-full relative flex-grow overflow-hidden",
        )}
      >
        <Flex
          className={cn(
            "dstr-scroll-container flex-col flex-grow overflow-x-hidden",
            // 意図: ビルドでユーティリティに !important が付くため、展開中は
            // overflow-y-scroll 自体を外して CSS のロック指定との競合を防ぐ。
            settings.inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED
              ? "mod-editor-expanded overflow-y-hidden"
              : "overflow-y-scroll",
          )}
          ref={scrollContainerRef}
        >
          {/* スクロールエリア内に置くことでポストリストと一緒にスクロールアウトできるようにする */}
          <div ref={listHeaderRef} className="dstr-list-header">
            {/* 意図: どのメインビューでも同じ投稿欄を常設し、展開アイコンを
                押したときだけ InputArea の最大化レイアウトへ切り替える。
                composer の開閉で一覧を置き換えない。 */}
            <InputArea />
            <div className="dstr-main-toolbar">
              {/* 意図: 全体検索の入口は表示切替のタブ枠から分離し、元のタブの選択を残す。 */}
              <div className="dstr-main-navigation">
                <MainViewTabs
                  value={
                    isSearchOpen
                      ? (settings.searchReturnState?.mainView ?? MAIN_VIEW.TIMELINE)
                      : mainView
                  }
                  noteMode={viewNoteMode}
                  onChange={setMainView}
                />
                <button
                  data-testid="dstr-global-search"
                  ref={(element) => {
                    searchButtonRef.current = element;
                    searchTooltipRef(element);
                  }}
                  type="button"
                  className={cn("dstr-search-trigger", isSearchOpen && "is-active")}
                  aria-expanded={isSearchOpen}
                  aria-controls={isSearchOpen ? searchPanelId : undefined}
                  onClick={() =>
                    isSearchOpen ? closeSearchPanel() : setMainView(MAIN_VIEW.SEARCH)
                  }
                >
                  <ObsidianIcon name="search" size="16px" className="pointer-events-none size-4 p-0" />
                  <span>検索</span>
                </button>
              </div>
              {isSearchOpen ? (
                <div id={searchPanelId}>
                  <SearchControls onClose={closeSearchPanel} />
                </div>
              ) : mainView === MAIN_VIEW.DATE ? (
                <StatusBar />
              ) : null}
            </div>
            {mainView === MAIN_VIEW.DATE ? <PastTodayNotice /> : null}
          </div>
          {content}
        </Flex>
      </Flex>

      {/* Right Sidebar: activity and archive statistics */}
      {capabilities.supportsSidebar && (
        <SidebarContainer isOpen={effectivelyRightOpen} side="right">
          <InsightsSidebar />
        </SidebarContainer>
      )}

      {!isCSSLoaded && (
        <div
          style={{
            position: "absolute",
            inset: "0",
            zIndex: 20,
            backgroundColor: "var(--background-primary)",
            display: "flex",
          }}
        >
          <Spinner className="size-6 text-[var(--text-muted)] [animation-duration:0.8s]" />
        </div>
      )}
    </Flex>
  );
};
