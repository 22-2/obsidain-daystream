import { normalizeFixedNotePath } from "src/core/fixed-note";
import type { DSTRStorage } from "src/core/storage";
import {
  type PersistedEditingPost,
  renameEditingPostPath,
} from "src/features/composer/store/slices/editorPersistence";
import {
  getDraftMetadataStorageKey,
  getEditingPostStorageKey,
  getInputAreaSizeStorageKey,
  getInputStorageKey,
} from "src/features/composer/store/slices/inputStorage";
import {
  type FixedNoteLeafLike,
  isSameFixedNote,
  isShowingFixedNote,
  rewriteLeafHistory,
} from "src/features/notes/utils/fixed-note-leaves";
import {
  getFixedSessionLastOpenedStorageKey,
  getFixedSessionMetaStorageKey,
} from "src/features/notes/utils/fixed-session-storage";

export type RenamableFixedNoteLeaf = FixedNoteLeafLike & { view?: unknown };

type FixedNoteRenameFollower = {
  followRenamedFixedNote: (oldPath: string, newPath: string) => void;
};

// 意図: notes から workspace の DSTRView クラスへ依存しないよう、追従用のメソッドだけで判定する。
function canFollowRename(view: unknown): view is FixedNoteRenameFollower {
  return (
    typeof view === "object" &&
    view !== null &&
    typeof Reflect.get(view, "followRenamedFixedNote") === "function"
  );
}

/**
 * 名前を変えた固定ノートを表示している leaf と、各 leaf の戻る/進む履歴を新しいパスへ移す。
 *
 * 意図: Daystream ビューは ItemView のため、Markdown ビューと違って Obsidian は
 * rename に追従しない。古いパスのままだと一覧が空になり、投稿で旧パスのノートが作り直される。
 */
export async function followRenamedFixedNoteLeaves(
  leaves: RenamableFixedNoteLeaf[],
  oldPath: string,
  newPath: string,
): Promise<void> {
  const normalizedOldPath = normalizeFixedNotePath(oldPath);

  for (const leaf of leaves) {
    if (canFollowRename(leaf.view)) {
      leaf.view.followRenamedFixedNote(oldPath, newPath);
      continue;
    }
    // 遅延読み込み中などでビューが未生成の leaf は、保存された view state を書き換える。
    if (!isShowingFixedNote(leaf, normalizedOldPath)) continue;
    const viewState = leaf.getViewState();
    await leaf.setViewState({ ...viewState, state: { ...viewState.state, file: newPath } });
  }

  rewriteLeafHistory(leaves, (entry) => {
    const entryState = entry.state;
    if (!entryState || !isSameFixedNote(entryState.state?.file, normalizedOldPath)) return entry;
    return { ...entry, state: { ...entryState, state: { ...entryState.state, file: newPath } } };
  });
}

function moveStorageValue<T>(
  storage: DSTRStorage,
  fromKey: string,
  toKey: string,
  transform: (value: T) => T = (value) => value,
): void {
  const missing = {};
  const value = storage.get<T | typeof missing>(fromKey, missing);
  if (value === missing) return;
  // 意図: 開いているビューが新しいパスへ保存し直した最新の入力を、古い保存値で上書きしない。
  if (storage.get<unknown>(toKey, missing) === missing) storage.set(toKey, transform(value as T));
  storage.remove(fromKey);
}

/** 名前を変えた固定ノートの、パスをキーにした保存値（下書き・編集中投稿・入力欄サイズ・最後のセッション）を移す。 */
export function moveFixedNoteStorage(
  storage: DSTRStorage,
  oldPath: string,
  newPath: string,
  sessionNumbers: number[],
): void {
  const keyBuilders: Array<(path: string) => string> = [
    ...sessionNumbers.flatMap((sessionNumber) => [
      (path: string) => getInputStorageKey("fixed", path, sessionNumber),
      (path: string) => getDraftMetadataStorageKey("fixed", path, sessionNumber),
    ]),
    // 固定ノートの入力欄サイズは粒度・日付を使わずファイル単位で保存している。
    (path) => getInputAreaSizeStorageKey("fixed", path, "day", ""),
    getFixedSessionLastOpenedStorageKey,
    getFixedSessionMetaStorageKey,
  ];

  for (const buildKey of keyBuilders) {
    moveStorageValue(storage, buildKey(oldPath), buildKey(newPath));
  }

  // 意図: 編集中投稿は本文の再特定に path を使うため、キーだけでなく中身のパスも新しくする。
  for (const sessionNumber of sessionNumbers) {
    moveStorageValue<PersistedEditingPost>(
      storage,
      getEditingPostStorageKey("fixed", oldPath, sessionNumber),
      getEditingPostStorageKey("fixed", newPath, sessionNumber),
      (persisted) => renameEditingPostPath(persisted, oldPath, newPath),
    );
  }
}
