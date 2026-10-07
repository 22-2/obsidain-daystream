import type { Post } from "src/core/domain/post";

/** 意図: 下書きと編集状態の型を投稿入力機能のStoreと同じ場所で管理する。 */
export interface Draft {
  id: string;
  content: string;
  createdAt: number;
}

export interface EditorSlice {
  composerOpen: boolean;
  inputSnapshot: string;
  inputSnapshotVersion: number;
  draftMetadata: Record<string, string>;
  draftMetadataBase: Record<string, string>;
  editingPost: Post | null;
  editingPostOffset: number | null;
  highlightedPost: Post | null;
  highlightRequestId: number;
  syncInputSession: (v: string) => void;
  openComposer: () => void;
  closeComposer: () => void;
  replaceInput: (v: string) => void;
  clearInput: () => void;
  setDraftMetadata: (metadata: Record<string, string>) => void;
  setDraftMetadataBase: (metadata: Record<string, string>) => void;
  getInputValue: () => string;
  setEditingPost: (post: Post | null) => void;
  setHighlightedPost: (post: Post | null) => void;
  clearHighlightedPost: () => void;
  startEdit: (post: Post) => void;
  cancelEdit: () => void;
  getEditingPost: (posts: Post[]) => Post | null;
  canSubmit: (posts: Post[], currentValue?: string) => boolean;
  hydrateEditorState: () => void;
}

export interface DraftSlice {
  drafts: Draft[];
  addDraft: (content: string) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
  hydrateDraftState: () => void;
}
