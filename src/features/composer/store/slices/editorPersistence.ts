import { obsidianMoment } from "src/core/platform/obsidian-globals";
import type { Granularity } from "src/core/domain/granularity";
import type { MomentLike, Post } from "src/core/domain/post";
import type { DSTRStorage } from "src/core/storage";
import {
  getDraftMetadataStorageKey,
  getEditingPostStorageKey,
  getInputStorageKey,
} from "src/features/composer/store/slices/inputStorage";
import type { DSTRNoteMode } from "src/features/workspace/views/state";

export type DraftMetadata = Record<string, string>;

export type PersistedDraftMetadataState = {
  draftMetadata: DraftMetadata;
  draftMetadataBase: DraftMetadata;
};

// 編集中投稿のセッション情報を1オブジェクトにまとめて永続化する。
// settingsPersistence が再起動後の表示を戻すため granularity / viewDateStr を参照する。
export type PersistedEditingPost = {
  id: string;
  path: string;
  timestampStr: string;
  metadataStr: string;
  /** 投稿元ノートの日付。旧バージョンの保存値では表示中の日付が入っていることがある。 */
  noteDateStr: string;
  offset: number;
  /** 編集開始時に表示していた粒度。 */
  granularity: string;
  /** 編集開始時に表示していた日付。旧バージョンの保存値には存在しない。 */
  viewDateStr?: string;
  /** 投稿元ノートの粒度。旧バージョンの保存値には存在しない。 */
  noteGranularity?: Granularity;
  /** 編集開始時の本文。旧バージョンの保存値には存在しない。 */
  message?: string;
};

/**
 * 編集中投稿の保存値を作る。
 * 意図: 一覧からの編集・ポップアウトへの転送で同じ形を保存し、
 * 元の本文やノートの日付が経路ごとに欠けたり意味が変わったりしないようにする。
 */
export function toPersistedEditingPost(
  post: Post,
  view: { date: MomentLike; granularity: Granularity },
): PersistedEditingPost {
  return {
    id: post.id,
    path: post.path,
    timestampStr: post.timestamp.toISOString(),
    metadataStr: JSON.stringify(post.metadata),
    noteDateStr: post.noteDate.toISOString(),
    offset: post.startOffset,
    granularity: view.granularity,
    viewDateStr: view.date.toISOString(),
    noteGranularity: post.noteGranularity,
    message: post.message,
  };
}

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

function editingPostKey(context: EditorPersistenceContext): string {
  return getEditingPostStorageKey(context.viewNoteMode, context.file, context.fixedSessionNumber);
}

export function persistEditingPost(
  context: EditorPersistenceContext,
  persisted: PersistedEditingPost,
): void {
  context.storage?.set(editingPostKey(context), persisted);
}

export function clearEditingPost(context: EditorPersistenceContext): void {
  context.storage?.remove(editingPostKey(context));
}

export function restoreEditingPost(context: EditorPersistenceContext): PersistedEditingPost | null {
  return context.storage?.get<PersistedEditingPost | null>(editingPostKey(context), null) ?? null;
}

/** 入力欄の未送信内容。ビュー・固定ノート・セッションの組ごとに保存する。 */
export interface InputSessionDraft {
  input: string;
  draftMetadata: DraftMetadata;
  draftMetadataBase: DraftMetadata;
}

/**
 * 入力欄の未送信内容をまとめて退避する。
 * 意図: ビューやセッションの切替で退避・復元の手順を一つにそろえ、
 * 本文だけ・メタデータだけが別の組へ残る食い違いを防ぐ。
 */
export function persistInputSession(
  context: EditorPersistenceContext,
  draft: InputSessionDraft,
): void {
  persistInput(context, draft.input);
  persistDraftMetadata(context, {
    draftMetadata: draft.draftMetadata,
    draftMetadataBase: draft.draftMetadataBase,
  });
}

export function restoreInputSession(context: EditorPersistenceContext): InputSessionDraft {
  const { storage, viewNoteMode, file, fixedSessionNumber } = context;
  const metadata = storage?.get<PersistedDraftMetadataState>(
    getDraftMetadataStorageKey(viewNoteMode, file, fixedSessionNumber),
    { draftMetadata: {}, draftMetadataBase: {} },
  ) ?? { draftMetadata: {}, draftMetadataBase: {} };

  return {
    input: storage?.get<string>(getInputStorageKey(viewNoteMode, file, fixedSessionNumber), "") ?? "",
    draftMetadata: metadata.draftMetadata,
    draftMetadataBase: metadata.draftMetadataBase,
  };
}

export function removeInputSession(context: EditorPersistenceContext): void {
  const { storage, viewNoteMode, file, fixedSessionNumber } = context;
  storage?.remove(getInputStorageKey(viewNoteMode, file, fixedSessionNumber));
  storage?.remove(getDraftMetadataStorageKey(viewNoteMode, file, fixedSessionNumber));
}

export function restoreEditorState(
  context: EditorPersistenceContext,
): PersistedEditorState | null {
  if (!context.storage) return null;

  const { input, draftMetadata, draftMetadataBase } = restoreInputSession(context);
  return {
    input,
    draftMetadata: { draftMetadata, draftMetadataBase },
    editingPost: restoreEditingPost(context),
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
): Post => ({
  id: persisted.id,
  path: persisted.path,
  timestamp: obsidianMoment(persisted.timestampStr),
  noteDate: obsidianMoment(persisted.noteDateStr),
  noteGranularity: persisted.noteGranularity,
  metadata: parsePersistedMetadata(persisted.metadataStr),
  message,
  startOffset: persisted.offset,
  endOffset: persisted.offset + message.length, // 近似値
  offset: persisted.offset,
  bodyStartOffset: persisted.offset, // 近似値
  kind: "thino" as const,
  threadRootId: null, // 必要に応じて解決される
});
