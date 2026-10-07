import type { MFDIStorage } from "src/core/storage";
import { STORAGE_KEYS } from "src/features/workspace/config/constants";
import { getDraftMetadataStorageKey, getInputStorageKey } from "src/features/composer/store/slices/inputStorage";
import type { MFDINoteMode } from "src/features/workspace/views/state";

export type DraftMetadata = Record<string, string>;

export type PersistedDraftMetadataState = {
  draftMetadata: DraftMetadata;
  draftMetadataBase: DraftMetadata;
};

// 編集中投稿のセッション情報を1オブジェクトにまとめて永続化する。
// settingsSlice が granularity / noteDateStr を参照するため両フィールドを含める。
export type PersistedEditingPost = {
  id: string;
  path: string;
  timestampStr: string;
  metadataStr: string;
  noteDateStr: string;
  offset: number;
  granularity: string;
};

export interface EditorPersistenceContext {
  storage: MFDIStorage | null;
  viewNoteMode: MFDINoteMode;
  file: string | null;
  fixedSessionNumber: number;
}

export interface PersistedEditorState {
  input: string;
  draftMetadata: PersistedDraftMetadataState;
  editingPost: PersistedEditingPost | null;
}

export function persistInput(context: EditorPersistenceContext, input: string): void {
  context.storage?.set(
    getInputStorageKey(context.viewNoteMode, context.file, context.fixedSessionNumber),
    input,
  );
}

export function persistDraftMetadata(
  context: EditorPersistenceContext,
  state: PersistedDraftMetadataState,
): void {
  context.storage?.set(
    getDraftMetadataStorageKey(context.viewNoteMode, context.file, context.fixedSessionNumber),
    state,
  );
}

export function persistEditingPost(
  storage: MFDIStorage | null,
  persisted: PersistedEditingPost,
): void {
  storage?.set(STORAGE_KEYS.EDITING_POST, persisted);
}

export function clearEditingPost(storage: MFDIStorage | null): void {
  storage?.remove(STORAGE_KEYS.EDITING_POST);
}

export function restoreEditorState(
  context: EditorPersistenceContext,
): PersistedEditorState | null {
  if (!context.storage) return null;

  return {
    input: context.storage.get<string>(
      getInputStorageKey(context.viewNoteMode, context.file, context.fixedSessionNumber),
      "",
    ),
    draftMetadata: context.storage.get<PersistedDraftMetadataState>(
      getDraftMetadataStorageKey(context.viewNoteMode, context.file, context.fixedSessionNumber),
      {
        draftMetadata: {},
        draftMetadataBase: {},
      },
    ),
    editingPost: context.storage.get<PersistedEditingPost | null>(
      STORAGE_KEYS.EDITING_POST,
      null,
    ),
  };
}

// 意図: popoutエディタビューが別JSコンテキストでstartEditに渡すPostを
// 再構築できるよう、シリアライズ済みデータからPostを復元する。
export const reconstructEditingPost = (persisted: PersistedEditingPost, message: string) => ({
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
