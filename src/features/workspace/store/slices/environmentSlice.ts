import { createTimelineNavigationState } from "src/features/workspace/store/slices/settingsDefaults";
import { MAIN_VIEW } from "src/features/workspace/config/constants";
import {
  persistInputSession,
  restoreInputSession,
} from "src/features/composer/store/slices/editorPersistence";
import type { EnvironmentSlice, DSTRStore } from "src/features/workspace/store/slices/types";
import { resolveMainViewCompatibilityState } from "src/features/workspace/utils/main-view-state";
import { createDefaultDSTRViewState } from "src/features/workspace/views/state";
import type { StateCreator } from "zustand/vanilla";

export const createEnvironmentSlice: StateCreator<DSTRStore, [], [], EnvironmentSlice> = (
  set,
  get,
) => ({
  shell: null,
  storage: null,
  pluginSettings: null,
  viewNoteMode: "periodic",
  file: null,

  setAppDependencies: (shell) => {
    set({ shell });
  },

  setStorage: (storage) => {
    set({ storage });
  },

  setPluginSettings: (pluginSettings) => {
    set({ pluginSettings });
  },

  setViewContext: ({ noteMode, file, fixedSessionNumber }) => {
    const {
      storage,
      viewNoteMode,
      file: currentFixedNotePath,
      fixedSessionNumber: currentFixedSessionNumber,
      getInputValue,
      replaceInput,
      draftMetadata,
      draftMetadataBase,
    } = get();

    const nextFixedSessionNumber =
      noteMode === "fixed" ? (fixedSessionNumber ?? currentFixedSessionNumber) : 1;

    const hasInputContextChanged =
      viewNoteMode !== noteMode ||
      currentFixedNotePath !== file ||
      currentFixedSessionNumber !== nextFixedSessionNumber;

    if (storage && hasInputContextChanged) {
      // 意図: periodic/fixed で編集中テキストを汚染しないよう、切替直前に現在ビューの入力を退避する。
      persistInputSession(
        {
          storage,
          viewNoteMode,
          file: currentFixedNotePath,
          fixedSessionNumber: currentFixedSessionNumber,
        },
        { input: getInputValue(), draftMetadata, draftMetadataBase },
      );
    }

    // 意図: restore 時は note/file/session を1回で切り替え、
    // 中間状態（sessionだけ先に変わる等）で余計な復元や再計算が走るのを避ける。
    set({
      viewNoteMode: noteMode,
      file: file,
      fixedSessionNumber: nextFixedSessionNumber,
    });

    if (storage && hasInputContextChanged) {
      // 意図: 切替先ビュー専用の入力だけを復元し、前ビューの未送信入力が混ざるのを防ぐ。
      const restored = restoreInputSession({
        storage,
        viewNoteMode: noteMode,
        file,
        fixedSessionNumber: nextFixedSessionNumber,
      });
      replaceInput(restored.input);
      set({
        draftMetadata: restored.draftMetadata,
        draftMetadataBase: restored.draftMetadataBase,
      });
    }

    if (hasInputContextChanged) {
      get().reloadInputAreaSize();
    }
  },

  initializeAppStore: ({ shell, settings, storage, initialViewState }) => {
    const nextNoteMode = initialViewState?.noteMode ?? get().viewNoteMode;
    const nextFile = initialViewState?.file ?? get().file;
    const nextFixedSessionNumber =
      nextNoteMode === "fixed"
        ? (initialViewState?.fixedSessionNumber ?? get().fixedSessionNumber)
        : 1;

    set({
      shell,
      pluginSettings: settings,
      storage,
      viewNoteMode: nextNoteMode,
      file: nextFile,
    });
    get().hydrateSettingsState();

    if (nextNoteMode === "fixed") {
      const fixedDefaults = createDefaultDSTRViewState({
        noteMode: "fixed",
        file: nextFile,
      });

      // 意図: restore 済み fixed view は初回 hydration から正しい session/input を見る必要がある。
      // 先に fixed defaults と session を確定させ、periodic 初期値を一瞬でも通らないようにする。
      set({
        viewNoteMode: nextNoteMode,
        file: nextFile,
        fixedSessionNumber: nextFixedSessionNumber,
        displayMode: fixedDefaults.displayMode,
        contentView: "timeline",
        mainView: MAIN_VIEW.TIMELINE,
        granularity: fixedDefaults.granularity,
        dateFilter: fixedDefaults.dateFilter,
        timeFilter: fixedDefaults.timeFilter,
        asTask: fixedDefaults.asTask,
        threadOnly: fixedDefaults.threadOnly,
        activeTag: null,
        threadFocusRootId: null,
      });
    } else {
      set({ fixedSessionNumber: 1 });

      const initialMainView = initialViewState?.mainView;
      if (initialMainView && Object.values(MAIN_VIEW).includes(initialMainView)) {
        // 意図: 新しい view は vault 全体に残った前回のタブではなく、
        // Obsidian が復元した当該タブの mainView を初期値として使う。
        set({
          mainView: initialMainView,
          ...resolveMainViewCompatibilityState(initialMainView, get().displayMode),
          searchInputOpen: initialMainView === MAIN_VIEW.SEARCH,
          threadFocusRootId: null,
        });
      }
    }

    if (nextNoteMode === "periodic" && get().mainView === MAIN_VIEW.TIMELINE) {
      set(createTimelineNavigationState());
    }

    get().hydrateEditorState();
    get().hydrateDraftState();
  },
});
