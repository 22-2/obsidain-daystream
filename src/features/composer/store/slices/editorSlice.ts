import { INPUT_AREA_SIZE } from "src/features/workspace/config/constants";
import {
  clearEditingPost,
  persistDraftMetadata,
  persistEditingPost,
  persistInput as persistInputValue,
  reconstructEditingPost,
  restoreEditorState,
  toPersistedEditingPost,
} from "src/features/composer/store/slices/editorPersistence";
import type {
  DraftMetadata,
  PersistedDraftMetadataState,
} from "src/features/composer/store/slices/editorPersistence";
import type { DSTRStore } from "src/features/workspace/store/slices/types";
import type { EditorSlice } from "src/features/composer/store/types";
import type { StateCreator } from "zustand/vanilla";

type PersistMode = "debounced" | "immediate";

type UpdateSessionInputOptions = {
  updateEditor?: boolean;
  persistMode?: PersistMode;
};

export function mergeDraftMetadataForSubmit(params: {
  latestMetadata: DraftMetadata;
  draftMetadataBase: DraftMetadata;
  draftMetadata: DraftMetadata;
}): DraftMetadata {
  const { latestMetadata, draftMetadataBase, draftMetadata } = params;
  const merged = { ...latestMetadata };

  // 意図: composer 側で消されたキーは submit 時にも消えるよう、
  // 初期状態から現在状態への差分を latestMetadata に適用する。
  for (const key of Object.keys(draftMetadataBase)) {
    if (!(key in draftMetadata)) {
      delete merged[key];
    }
  }

  return { ...merged, ...draftMetadata };
}

export const createEditorSlice: StateCreator<DSTRStore, [], [], EditorSlice> = (set, get) => {
  let inputPersistTimer: number | null = null;

  const persistInput = (input: string, mode: PersistMode) => {
    const { viewNoteMode, file, fixedSessionNumber } = get();

    if (inputPersistTimer !== null) {
      window.clearTimeout(inputPersistTimer);
      inputPersistTimer = null;
    }

    if (mode === "immediate") {
      persistInputValue(
        { storage: get().storage, viewNoteMode, file, fixedSessionNumber },
        input,
      );
      return;
    }

    inputPersistTimer = window.setTimeout(() => {
      persistInputValue(
        { storage: get().storage, viewNoteMode, file, fixedSessionNumber },
        input,
      );
      inputPersistTimer = null;
    }, 200);
  };

  const saveDraftMetadata = (state: PersistedDraftMetadataState) => {
    const { storage, viewNoteMode, file, fixedSessionNumber } = get();
    persistDraftMetadata({ storage, viewNoteMode, file, fixedSessionNumber }, state);
  };

  const updateSessionInput = (input: string, options: UpdateSessionInputOptions = {}) => {
    const { updateEditor, persistMode = "debounced" } = options;

    set((state) => ({
      inputSnapshot: input,
      ...(updateEditor ? { inputSnapshotVersion: state.inputSnapshotVersion + 1 } : {}),
    }));
    persistInput(input, persistMode);
  };

  return {
    composerOpen: false,
    inputSnapshot: "",
    inputSnapshotVersion: 0,
    draftMetadata: {},
    draftMetadataBase: {},
    editingPost: null,
    editingPostOffset: null,
    highlightedPost: null,
    highlightRequestId: 0,

    syncInputSession: (input) => {
      updateSessionInput(input, {
        persistMode: "debounced",
      });
    },

    openComposer: () => {
      set({ composerOpen: true });
    },

    closeComposer: () => {
      const input = get().inputSnapshot;

      // 意図: 明示的に閉じた入力は入力セッションとして再表示せず、下書き一覧から
      // 必要なときだけ復元できるよう、下書きへ移してから永続中の入力を消去する。
      get().addDraft(input);
      get().clearInput();
      set({ composerOpen: false });
    },

    replaceInput: (input) => {
      updateSessionInput(input, {
        updateEditor: true,
        persistMode: "immediate",
      });
    },

    clearInput: () => {
      updateSessionInput("", {
        updateEditor: true,
        persistMode: "immediate",
      });
      set({ draftMetadata: {}, draftMetadataBase: {} });
      saveDraftMetadata({ draftMetadata: {}, draftMetadataBase: {} });
    },

    setDraftMetadata: (metadata) => {
      set({ draftMetadata: metadata });
      saveDraftMetadata({
        draftMetadata: metadata,
        draftMetadataBase: get().draftMetadataBase,
      });
    },

    setDraftMetadataBase: (metadata) => {
      set({ draftMetadataBase: metadata });
      saveDraftMetadata({
        draftMetadata: get().draftMetadata,
        draftMetadataBase: metadata,
      });
    },

    getInputValue: () => get().inputSnapshot,

    setEditingPost: (post) => {
      set({ editingPost: post, editingPostOffset: post?.startOffset ?? null });
    },

    setHighlightedPost: (post) => {
      set((state) => ({
        highlightedPost: post,
        highlightRequestId: post !== null ? state.highlightRequestId + 1 : state.highlightRequestId,
      }));
    },

    clearHighlightedPost: () => {
      set({ highlightedPost: null });
    },

    startEdit: (post) => {
      const {
        date,
        granularity,
        inputAreaSize,
        setAsTask,
        replaceInput,
        storage,
        viewNoteMode,
        file,
        fixedSessionNumber,
      } = get();
      // 意図: 編集開始時に minimized だと入力欄が見えないので default に戻す。
      // maximized は編集対象を切り替えても維持し、ユーザーの表示状態を意図せず変えない。
      // set() を直接使い storage へは書き込まない。
      // ユーザーが設定した inputAreaSize の永続値を上書きしないようにするため。
      if (inputAreaSize === INPUT_AREA_SIZE.MINIMIZED) {
        set({ inputAreaSize: INPUT_AREA_SIZE.DEFAULT });
      }

      setAsTask(false);
      set({ editingPost: post, editingPostOffset: post.startOffset });
      set({
        draftMetadata: { ...post.metadata },
        draftMetadataBase: { ...post.metadata },
      });
      saveDraftMetadata({
        draftMetadata: { ...post.metadata },
        draftMetadataBase: { ...post.metadata },
      });

      // 編集セッション情報を1キーにまとめて保存する
      persistEditingPost(
        { storage, viewNoteMode, file, fixedSessionNumber },
        toPersistedEditingPost(post, { date, granularity }),
      );

      replaceInput(post.message);
    },

    cancelEdit: () => {
      const { storage, viewNoteMode, file, fixedSessionNumber, clearInput } = get();

      set({ editingPost: null, editingPostOffset: null });
      set({ draftMetadata: {}, draftMetadataBase: {} });
      clearEditingPost({ storage, viewNoteMode, file, fixedSessionNumber });
      clearInput();
    },

    getEditingPost: (posts) => {
      const { editingPost, editingPostOffset } = get();
      if (editingPost) return editingPost;
      if (editingPostOffset === null) return null;
      return posts.find((post) => post.startOffset === editingPostOffset) ?? null;
    },

    canSubmit: (posts, currentValue) => {
      const { getInputValue, granularity, getEffectiveDate, getEditingPost, isDateReadOnly } =
        get();
      const input = currentValue ?? getInputValue();
      const effectiveDate = getEffectiveDate();

      if (isDateReadOnly(effectiveDate, granularity)) return false;

      const editingPost = getEditingPost(posts);
      if (!editingPost) return input.trim().length > 0;

      return input !== editingPost.message;
    },

    hydrateEditorState: () => {
      const { storage, viewNoteMode, file, fixedSessionNumber } = get();
      const persistedState = restoreEditorState({
        storage,
        viewNoteMode,
        file,
        fixedSessionNumber,
      });
      if (!persistedState) return;

      const reconstructedPost =
        persistedState.editingPost !== null
          ? reconstructEditingPost(persistedState.editingPost, persistedState.input)
          : null;

      set((state) => ({
        inputSnapshot: state.inputSnapshot || persistedState.input,
        inputSnapshotVersion: state.inputSnapshotVersion + 1,
        editingPostOffset: state.editingPostOffset ?? persistedState.editingPost?.offset ?? null,
        editingPost: state.editingPost ?? reconstructedPost,
        draftMetadata:
          Object.keys(state.draftMetadata).length > 0
            ? state.draftMetadata
            : persistedState.draftMetadata.draftMetadata,
        draftMetadataBase:
          Object.keys(state.draftMetadataBase).length > 0
            ? state.draftMetadataBase
            : persistedState.draftMetadata.draftMetadataBase,
      }));
    },
  };
};
