import type { App } from "obsidian";
import { useEffect, useRef } from "react";
import type { Settings } from "src/core/domain/settings";
import { AppContextProvider, useAppContext } from "src/core/ui/context/AppContext";
import { ComponentContextProvider, useObsidianComponent } from "src/core/ui/context/ComponentContext";
import { EditorRefsProvider, useEditorRefs } from "src/features/composer/context/EditorRefsContext";
import { useDbSync } from "src/features/workspace/hooks/useDbSync";
import { useAppStoreInitialization } from "src/features/workspace/hooks/internal/useAppStoreInitialization";
import { useMFDIViewDelegates } from "src/features/workspace/hooks/internal/useMFDIViewDelegates";
import { useMFDIViewStateSync } from "src/features/workspace/hooks/internal/useMFDIViewStateSync";
import { useNoteSync } from "src/features/notes/hooks/useNoteSync";
import { invalidateInsightsCaches } from "src/features/insights/invalidate-caches";
import { MFDIWorkspaceLayout } from "src/features/workspace/components/layout/MFDIWorkspaceLayout";
import { PostsProvider } from "src/features/posts/hooks/usePosts";
import type { AppStoreApi } from "src/features/workspace/store/appStore";
import {
  AppStoreProvider,
  createAppStore,
  useAppStore,
  useRequiredAppStore,
} from "src/features/workspace/store/appStore";
import { useNoteStore } from "src/features/notes/store/noteStore";
import { useTasksStore } from "src/features/tasks/store/tasksStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { MFDIView } from "src/features/workspace/views/MFDIView";
import type { MFDIViewState } from "src/features/workspace/views/state";
import { syncStoreFromMFDIViewState } from "src/features/workspace/views/sync-store-from-view-state";
import { useShallow } from "zustand/shallow";

export const ReactView = ({
  app,
  settings,
  view,
}: {
  app: App;
  settings: Settings;
  view: MFDIView;
}) => {
  const storeRef = useRef<AppStoreApi | null>(null);
  const initialViewStateRef = useRef({ ...view.getState() });
  if (!storeRef.current) {
    const store = createAppStore();
    // 意図: 復元直後の初回 render から fixed note / session を一致させ、
    // periodic の既定状態を一瞬でも通さないことで restore 時の過剰な再同期を避ける。
    syncStoreFromMFDIViewState(store, initialViewStateRef.current);
    storeRef.current = store;
  }

  return (
    <AppContextProvider app={app} settings={settings}>
      <ComponentContextProvider component={view}>
        <AppStoreProvider store={storeRef.current}>
          <EditorRefsProvider>
            <PostsProvider>
              <MFDIAppRoot
                initialViewState={initialViewStateRef.current}
              >
                <MFDIWorkspaceLayout />
              </MFDIAppRoot>
            </PostsProvider>
          </EditorRefsProvider>
        </AppStoreProvider>
      </ComponentContextProvider>
    </AppContextProvider>
  );
};

const MFDIAppRoot: React.FC<{
  children: React.ReactNode;
  initialViewState: MFDIViewState;
}> = ({ children, initialViewState }) => {
  const { settings, storage, shell } = useAppContext();
  const component = useObsidianComponent() as MFDIView;
  const store = useRequiredAppStore();
  const { viewNoteMode, file } = useAppStore(
    useShallow((s) => ({
      viewNoteMode: s.viewNoteMode,
      file: s.file,
    })),
  );

  const componentViewState = component.getState();
  const externalStateRevision = component.getExternalStateRevision();

  useAppStoreInitialization(
    {
      shell,
      settings,
      storage,
      initialViewState: {
        noteMode: initialViewState.noteMode,
        file: initialViewState.file,
        fixedSessionNumber:
          initialViewState.noteMode === "fixed" ? (initialViewState.fixedSessionNumber ?? 1) : 1,
        mainView: initialViewState.mainView,
      },
    },
    store,
  );

  const { date, granularity, activeTopic, dateFilter, asTask, isReadOnly } = useSettingsStore(
    useShallow((state) => ({
      date: state.date,
      granularity: state.granularity,
      activeTopic: state.activeTopic,
      dateFilter: state.dateFilter,
      asTask: state.asTask,
      isReadOnly: state.isReadOnly(),
    })),
  );

  const { currentDailyNote } = useNoteStore(
    useShallow((state) => ({
      currentDailyNote: state.currentDailyNote,
    })),
  );

  const { updateTasks } = useTasksStore(
    useShallow((state) => ({
      updateTasks: state.updateTasks,
    })),
  );

  const { searchQuery } = useSettingsStore(
    useShallow((state) => ({
      searchQuery: state.searchQuery,
    })),
  );

  const { inputRef, scrollContainerRef } = useEditorRefs();

  useNoteSync();
  useDbSync(invalidateInsightsCaches);

  useEffect(() => {
    // 通常の UI 操作では store が正となり、store同期hookから viewState へ片方向に書く。
    // Obsidian が setState で復元した場合だけ逆方向に同期し、古い session 番号との競合を防ぐ。
    syncStoreFromMFDIViewState(store, componentViewState);
  }, [store, externalStateRevision]);

  useEffect(() => {
    store.getState().updateCurrentDailyNote(shell);
  }, [store, shell, date, granularity, activeTopic, viewNoteMode, file]);

  useEffect(() => {
    if (!isReadOnly && inputRef.current) {
      setTimeout(() => {
        const input = inputRef.current;
        const activeElement = component.containerEl.ownerDocument.activeElement;

        // 意図: 日付操作中や検索を閉じて入口へ戻った直後は、状態復元に伴う
        // 投稿エディタの自動フォーカスで、現在のコントロールから操作を奪わない。
        if (activeElement?.closest(
          ".mfdi-hierarchical-date-input, .mfdi-main-navigation, .mfdi-search-controls",
        )) return;
        input?.focus();
      });
    }
  }, [component, date, granularity, activeTopic, dateFilter, asTask, isReadOnly, inputRef]);

  useEffect(() => {
    if (!currentDailyNote) return;

    // 意図: 投稿一覧の取得は SWR が担うため、この effect はタスク更新だけを開始する。
    void updateTasks(currentDailyNote);
  }, [currentDailyNote, dateFilter, updateTasks, viewNoteMode, searchQuery]);

  // Sync state/handlers with Obsidian View
  useMFDIViewStateSync(component);
  useMFDIViewDelegates(component);

  useEffect(() => {
    return () => {
      const editorState = store.getState();
      const hasEditingState =
        editorState.editingPost !== null || editorState.editingPostOffset !== null;
      // 意図: 既存投稿の編集中は、永続済みの編集対象と入力をそのまま残し、
      // 閉じたタブを再度開いたときに編集を続けられるようにする。
      if (hasEditingState) return;
      if (!editorState.composerOpen && !editorState.inputSnapshot.trim()) return;

      // 意図: タブを閉じると composer の閉じる操作を経由しないため、
      // ビュー破棄時にも新規入力を下書きへ移して次回の自動復元を防ぐ。
      editorState.closeComposer();
    };
  }, [store]);

  // Parent and child effects have both installed their delegates by this point.
  useEffect(() => {
    component.notifyReactReady();
  }, [component]);

  // Initial scroll position when note changes
  useEffect(() => {
    if (!currentDailyNote || !scrollContainerRef.current) return;
    const timer = setTimeout(() => {
      scrollContainerRef.current?.scrollTo({ top: 0 });
    }, 0);
    return () => clearTimeout(timer);
  }, [currentDailyNote, scrollContainerRef]);

  return <>{children}</>;
};
