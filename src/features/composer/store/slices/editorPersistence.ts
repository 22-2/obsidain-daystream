import { obsidianMoment } from "src/core/platform/obsidian-globals";
import type { DSTRStorage } from "src/core/storage";
import { STORAGE_KEYS } from "src/features/workspace/config/constants";
import { getDraftMetadataStorageKey, getInputStorageKey } from "src/features/composer/store/slices/inputStorage";
import type { DSTRNoteMode } from "src/features/workspace/views/state";

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
  /** 編集開始時の本文。旧バージョンの保存値には存在しない。 */
  message?: string;
};

export interface EditorPersistenceContext {
  storage: DSTRStorage | null;
  viewNoteMode: DSTRNoteMode;
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
  storage: DSTRStorage | null,
  persisted: PersistedEditingPost,
): void {
  storage?.set(STORAGE_KEYS.EDITING_POST, persisted);
}

/** 名前を変えたノートの編集中投稿を、新しいパスを指すように保存し直す。 */
export function moveEditingPostPath(
  storage: DSTRStorage | null,
  oldPath: string,
  newPath: string,
): void {
  const persisted = storage?.get<PersistedEditingPost | null>(STORAGE_KEYS.EDITING_POST, null);
  if (!persisted || persisted.path !== oldPath) return;
  storage?.set(STORAGE_KEYS.EDITING_POST, { ...persisted, path: newPath });
}

export function clearEditingPost(storage: DSTRStorage | null): void {
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

const isStringRecord = (value: unknown): value is Record<string, string> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((item) => typeof item === "string");
};

// 意図: 保存値は metadata の文字列マップだけを想定し、形が違うものを any のまま Post に流さない。
const parsePersistedMetadata = (raw: string): Record<string, string> => {
  const parsed: unknown = JSON.parse(raw);
  if (!isStringRecord(parsed)) {
    throw new Error("Persisted editing post metadata is not a string record");
  }
  return parsed;
};

// 意図: popoutエディタビューが別JSコンテキストでstartEditに渡すPostを
// 再構築できるよう、シリアライズ済みデータからPostを復元する。
// 意図: 復元後も「元の本文と入力が違うか」で更新可否を判定するため、保存済みの元本文を優先する。
export const reconstructEditingPost = (
  persisted: PersistedEditingPost,
  input: string,
  message = persisted.message ?? input,
) => ({
  id: persisted.id,
  path: persisted.path,
  timestamp: obsidianMoment(persisted.timestampStr),
  noteDate: obsidianMoment(persisted.noteDateStr),
  metadata: parsePersistedMetadata(persisted.metadataStr),
  message,
  startOffset: persisted.offset,
  endOffset: persisted.offset + message.length, // 近似値
  offset: persisted.offset,
  bodyStartOffset: persisted.offset, // 近似値
  kind: "thino" as const,
  threadRootId: null, // 必要に応じて解決される
});
