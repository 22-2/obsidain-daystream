import { getDraftMetadataStorageKey, getInputStorageKey } from "src/ui/store/slices/inputStorage";
import type { EnvironmentSlice, MFDIStore } from "src/ui/store/slices/types";
import { createDefaultMFDIViewState } from "src/ui/view/state";
import type { StateCreator } from "zustand/vanilla";

export const createEnvironmentSlice: StateCreator<MFDIStore, [], [], EnvironmentSlice> = (
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
    } = get();

    const nextFixedSessionNumber =
      noteMode === "fixed" ? (fixedSessionNumber ?? currentFixedSessionNumber) : 1;

    const hasInputContextChanged =
      viewNoteMode !== noteMode ||
      currentFixedNotePath !== file ||
      currentFixedSessionNumber !== nextFixedSessionNumber;

    if (storage && hasInputContextChanged) {
      // 意図: periodic/fixed で編集中テキストを汚染しないよう、切替直前に現在ビューの入力を退避する。
      storage.set(
        getInputStorageKey(viewNoteMode, currentFixedNotePath, currentFixedSessionNumber),
        getInputValue(),
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
      const restoredInput = storage.get<string>(
        getInputStorageKey(noteMode, file, nextFixedSessionNumber),
        "",
      );
      const restoredDraftMetadata = storage.get<{
        draftMetadata: Record<string, string>;
        draftMetadataBase: Record<string, string>;
      }>(getDraftMetadataStorageKey(noteMode, file, nextFixedSessionNumber), {
        draftMetadata: {},
        draftMetadataBase: {},
      });
      replaceInput(restoredInput);
      set({
        draftMetadata: restoredDraftMetadata.draftMetadata,
        draftMetadataBase: restoredDraftMetadata.draftMetadataBase,
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
      const fixedDefaults = createDefaultMFDIViewState({
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
    }

    get().hydrateEditorState();
    get().hydrateDraftState();
  },
});
