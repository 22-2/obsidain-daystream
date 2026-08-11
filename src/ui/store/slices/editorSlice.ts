import { INPUT_AREA_SIZE, STORAGE_KEYS } from "src/ui/config/consntants";
import {
  getDraftMetadataStorageKey,
  getInputStorageKey,
} from "src/ui/store/slices/inputStorage";
import type { EditorSlice, MFDIStore } from "src/ui/store/slices/types";
import type { StateCreator } from "zustand/vanilla";

type PersistMode = "debounced" | "immediate";

type UpdateSessionInputOptions = {
  updateEditor?: boolean;
  persistMode?: PersistMode;
};

export type DraftMetadata = Record<string, string>;
export type PersistedDraftMetadataState = {
  draftMetadata: DraftMetadata;
  draftMetadataBase: DraftMetadata;
};

// 編集中投稿のセッション情報を1オブジェクトにまとめて永続化する
// settingsSlice が granularity / noteDateStr を参照するため両フィールドを含む
export type PersistedEditingPost = {
  id: string;
  path: string;
  timestampStr: string;
  metadataStr: string;
  noteDateStr: string;
  offset: number;
  granularity: string;
};

// 意図: popout エディタビューが別 JS コンテキストで startEdit に渡す Post を
// 再構築できるよう、シリアライズ済みデータから Post を復元する関数を公開する。
export const reconstructEditingPost = (
  persisted: PersistedEditingPost,
  message: string,
) => ({
  id: persisted.id,
  path: persisted.path,
  timestamp: window.moment(persisted.timestampStr),
  noteDate: window.moment(persisted.noteDateStr),
  metadata: JSON.parse(persisted.metadataStr),
  message,
  startOffset: persisted.offset,
  endOffset: persisted.offset + message.length, // 近似値
  offset: persisted.offset,
  bodyStartOffset: persisted.offset, // 近似値
  kind: "thino" as const,
  threadRootId: null, // 必要に応じて解決される
});

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

export const createEditorSlice: StateCreator<MFDIStore, [], [], EditorSlice> = (
  set,
  get,
) => {
  let inputPersistTimer: ReturnType<typeof setTimeout> | null = null;

  const persistInput = (input: string, mode: PersistMode) => {
    const { viewNoteMode, file: file, fixedSessionNumber } = get();
    const inputStorageKey = getInputStorageKey(
      viewNoteMode,
      file,
      fixedSessionNumber,
    );

    if (inputPersistTimer !== null) {
      clearTimeout(inputPersistTimer);
      inputPersistTimer = null;
    }

    if (mode === "immediate") {
      get().storage?.set(inputStorageKey, input);
      return;
    }

    inputPersistTimer = setTimeout(() => {
      get().storage?.set(inputStorageKey, input);
      inputPersistTimer = null;
    }, 200);
  };

  const persistDraftMetadata = (state: PersistedDraftMetadataState) => {
    const { storage, viewNoteMode, file, fixedSessionNumber } = get();
    storage?.set(
      getDraftMetadataStorageKey(viewNoteMode, file, fixedSessionNumber),
      state,
    );
  };

  const updateSessionInput = (
    input: string,
    options: UpdateSessionInputOptions = {},
  ) => {
    const { updateEditor, persistMode = "debounced" } = options;

    set((state) => ({
      inputSnapshot: input,
      ...(updateEditor
        ? { inputSnapshotVersion: state.inputSnapshotVersion + 1 }
        : {}),
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
      get().storage?.set(STORAGE_KEYS.COMPOSER_OPEN, true);
    },

    closeComposer: () => {
      set({ composerOpen: false });
      get().storage?.set(STORAGE_KEYS.COMPOSER_OPEN, false);
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
      persistDraftMetadata({ draftMetadata: {}, draftMetadataBase: {} });
    },

    setDraftMetadata: (metadata) => {
      set({ draftMetadata: metadata });
      persistDraftMetadata({
        draftMetadata: metadata,
        draftMetadataBase: get().draftMetadataBase,
      });
    },

    setDraftMetadataBase: (metadata) => {
      set({ draftMetadataBase: metadata });
      persistDraftMetadata({
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
        highlightRequestId:
          post !== null
            ? state.highlightRequestId + 1
            : state.highlightRequestId,
      }));
    },

    clearHighlightedPost: () => {
      set({ highlightedPost: null });
    },

    startEdit: (post) => {
      const { date, granularity, setAsTask, replaceInput, storage } = get();
      // 意図: 編集開始時に minimized だと入力欄が見えないので default に戻す。
      // set() を直接使い storage へは書き込まない。
      // ユーザーが設定した inputAreaSize の永続値を上書きしないようにするため。
      set({ inputAreaSize: INPUT_AREA_SIZE.DEFAULT });

      setAsTask(false);
      set({ editingPost: post, editingPostOffset: post.startOffset });
      set({
        draftMetadata: { ...post.metadata },
        draftMetadataBase: { ...post.metadata },
      });
      persistDraftMetadata({
        draftMetadata: { ...post.metadata },
        draftMetadataBase: { ...post.metadata },
      });

      // 編集セッション情報を1キーにまとめて保存する
      const persisted: PersistedEditingPost = {
        id: post.id,
        path: post.path,
        timestampStr: post.timestamp.toISOString(),
        metadataStr: JSON.stringify(post.metadata),
        noteDateStr: date.toISOString(),
        offset: post.startOffset,
        granularity,
      };
      storage?.set(STORAGE_KEYS.EDITING_POST, persisted);

      replaceInput(post.message);
    },

    cancelEdit: () => {
      const { storage, clearInput } = get();

      set({ editingPost: null, editingPostOffset: null });
      set({ draftMetadata: {}, draftMetadataBase: {} });
      storage?.remove(STORAGE_KEYS.EDITING_POST);
      clearInput();
    },

    getEditingPost: (posts) => {
      const { editingPost, editingPostOffset } = get();
      if (editingPost) return editingPost;
      if (editingPostOffset === null) return null;
      return (
        posts.find((post) => post.startOffset === editingPostOffset) ?? null
      );
    },

    canSubmit: (posts, currentValue) => {
      const {
        getInputValue,
        granularity,
        getEffectiveDate,
        getEditingPost,
        isDateReadOnly,
      } = get();
      const input = currentValue ?? getInputValue();
      const effectiveDate = getEffectiveDate();

      if (isDateReadOnly(effectiveDate, granularity)) return false;

      const editingPost = getEditingPost(posts);
      if (!editingPost) return input.trim().length > 0;

      return input !== editingPost.message;
    },

  hydrateEditorState: () => {
      const { storage, viewNoteMode, file: file, fixedSessionNumber } = get();
    if (!storage) return;

    const composerOpen = storage.get<boolean>(
      STORAGE_KEYS.COMPOSER_OPEN,
      false,
    );

      const persistedInput = storage.get<string>(
        getInputStorageKey(viewNoteMode, file, fixedSessionNumber),
        "",
      );
      const persistedDraftMetadata = storage.get<PersistedDraftMetadataState>(
        getDraftMetadataStorageKey(viewNoteMode, file, fixedSessionNumber),
        {
          draftMetadata: {},
          draftMetadataBase: {},
        },
      );

      const persisted = storage.get<PersistedEditingPost | null>(
        STORAGE_KEYS.EDITING_POST,
        null,
      );

      const reconstructedPost =
        persisted !== null
          ? reconstructEditingPost(persisted, persistedInput)
          : null;

    set((state) => ({
      composerOpen,
      inputSnapshot: state.inputSnapshot || persistedInput,
        inputSnapshotVersion: state.inputSnapshotVersion + 1,
        editingPostOffset: state.editingPostOffset ?? persisted?.offset ?? null,
        editingPost: state.editingPost ?? reconstructedPost,
        draftMetadata:
          Object.keys(state.draftMetadata).length > 0
            ? state.draftMetadata
            : persistedDraftMetadata.draftMetadata,
        draftMetadataBase:
          Object.keys(state.draftMetadataBase).length > 0
            ? state.draftMetadataBase
            : persistedDraftMetadata.draftMetadataBase,
      }));
    },
  };
};
