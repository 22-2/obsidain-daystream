import type { App } from "obsidian";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { Settings } from "src/settings";
import { AppContextProvider, useAppContext } from "src/ui/context/AppContext";
import { ComponentContextProvider, useObsidianComponent } from "src/ui/context/ComponentContext";
import { EditorRefsProvider, useEditorRefs } from "src/ui/context/EditorRefsContext";
import { useDbSync } from "src/ui/hooks/useDbSync";
import { useMFDIViewDelegates } from "src/ui/hooks/internal/useMFDIViewDelegates";
import { useMFDIViewStateSync } from "src/ui/hooks/internal/useMFDIViewStateSync";
import { useNoteSync } from "src/ui/hooks/useNoteSync";
import { MFDIWorkspaceLayout } from "src/ui/components/layout/MFDIWorkspaceLayout";
import { PostsProvider } from "src/ui/hooks/usePosts";
import type { AppStoreApi } from "src/ui/store/appStore";
import {
  AppStoreProvider,
  createAppStore,
  initializeAppStore,
  useAppStore,
  useRequiredAppStore,
} from "src/ui/store/appStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { MFDIView } from "src/ui/view/MFDIView";
import type { MFDIViewState } from "src/ui/view/state";
import { syncStoreFromMFDIViewState } from "src/ui/view/sync-store-from-view-state";
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

  useLayoutEffect(() => {
    // 意図: 子の live editor は mount 時の passive effect で初期化される。
    // ここで hydration が遅れると、空の初期 state が先に editor/localStorage へ流れて復元値を潰す。
    initializeAppStore(
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

  }, [initialViewState, settings, storage, shell, store]);

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

  const { updateTasks } = usePostsStore(
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
  useDbSync();

  useEffect(() => {
    // 通常の UI 操作では store が正となり、store同期hookから viewState へ片方向に書く。
    // Obsidian が setState で復元した場合だけ逆方向に同期し、古い session 番号との競合を防ぐ。
    syncStoreFromMFDIViewState(store, componentViewState);
  }, [store, externalStateRevision]);

  useEffect(() => {
    store.getState().updateCurrentDailyNote(shell);
  }, [store, shell, date, granularity, activeTopic, viewNoteMode, file]);

  // updatePostsFromDB is no longer needed here as SWR handles it

  // updatePostsForWeek and updatePostsForDays are no longer needed here as SWR handles it

  useEffect(() => {
    if (!isReadOnly && inputRef.current) {
      setTimeout(() => {
        const input = inputRef.current;
        const activeElement = component.containerEl.ownerDocument.activeElement;

        // 意図: 年月日のドロップダウンを連続操作している間は、日付更新後も
        // 投稿エディタへ自動フォーカスを移さず、現在のコントロールを維持する。
        if (activeElement?.closest(".mfdi-hierarchical-date-input")) return;
        input?.focus();
      });
    }
  }, [component, date, granularity, activeTopic, dateFilter, asTask, isReadOnly, inputRef]);

  useEffect(() => {
    if (!currentDailyNote) return;

    const promises: Promise<void>[] = [updateTasks(currentDailyNote)];
    // updatePosts is no longer needed here
    Promise.all(promises);
  }, [
    currentDailyNote,
    dateFilter,
    // updatePosts,
    updateTasks,
    viewNoteMode,
    searchQuery,
  ]);

  // Sync state/handlers with Obsidian View
  useMFDIViewStateSync(component);
  useMFDIViewDelegates(component);

  useEffect(() => {
    return () => {
      const editorState = store.getState();
      const hasEditingState =
        editorState.editingPost !== null || editorState.editingPostOffset !== null;
      if (!editorState.composerOpen && !editorState.inputSnapshot.trim() && !hasEditingState) return;

      // 意図: タブを閉じると composer の閉じる操作を経由しないため、
      // ビュー破棄時にも入力を下書きへ移して次回の自動復元を防ぐ。編集中投稿の
      // 永続情報も同時に消し、閉じたタブを再度開いたときに編集画面を再表示しない。
      editorState.closeComposer();
      if (hasEditingState) editorState.cancelEdit();
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
