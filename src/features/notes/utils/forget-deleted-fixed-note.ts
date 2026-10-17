import type { WorkspaceLeaf } from "obsidian";
import { normalizeFixedNotePath } from "src/core/fixed-note";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";
import { VIEW_TYPE_DSTR } from "src/core/view-types";

// 意図: leaf.history は Obsidian の非公開APIのため、実行時に構造を確かめてから触る。
// 項目は { state: { type, state: { file } }, eState } の形で保存されている。
type LeafHistoryEntry = { state?: { state?: { file?: unknown } } };
type LeafHistory = { backHistory: LeafHistoryEntry[]; forwardHistory: LeafHistoryEntry[] };

const DSTR_VIEW_TYPES = new Set<string>([VIEW_TYPE_DSTR, LEGACY_DAYSTREAM_IDENTIFIERS.viewType]);

// 意図: 削除処理が触るのは view state と履歴だけなので、必要な形だけを要求する。
// history の型は Obsidian の型定義と食い違うため unknown にして、使う前に形を確かめる。
type ForgettableLeaf = Pick<WorkspaceLeaf, "getViewState" | "setViewState"> & {
  history?: unknown;
};

function isLeafHistory(value: unknown): value is LeafHistory {
  return (
    typeof value === "object" &&
    value !== null &&
    "backHistory" in value &&
    "forwardHistory" in value &&
    Array.isArray(value.backHistory) &&
    Array.isArray(value.forwardHistory)
  );
}

function getLeafHistory(leaf: ForgettableLeaf): LeafHistory | null {
  return isLeafHistory(leaf.history) ? leaf.history : null;
}

function isSameFixedNote(file: unknown, normalizedPath: string): boolean {
  return typeof file === "string" && normalizeFixedNotePath(file) === normalizedPath;
}

function isShowingFixedNote(leaf: ForgettableLeaf, normalizedPath: string): boolean {
  const viewState = leaf.getViewState();
  return DSTR_VIEW_TYPES.has(viewState.type) && isSameFixedNote(viewState.state?.file, normalizedPath);
}

/**
 * 削除された固定ノートを、開いている leaf と各 leaf の戻る/進む履歴から取り除く。
 *
 * 意図: Daystream ビューは ItemView のため、Obsidian は削除済みファイルを
 * 履歴から除かない。残すと「戻る」で削除済みノートの空ビューが復元されてしまう。
 */
export async function forgetDeletedFixedNote(
  leaves: ForgettableLeaf[],
  deletedPath: string,
): Promise<void> {
  const normalizedPath = normalizeFixedNotePath(deletedPath);

  // Markdown ノートを削除したときと同様に、表示中の leaf は空タブにする。
  // setViewState は現在の表示を履歴へ積むため、履歴の掃除より先に行う。
  for (const leaf of leaves) {
    if (isShowingFixedNote(leaf, normalizedPath)) await leaf.setViewState({ type: "empty" });
  }

  const isKept = (entry: LeafHistoryEntry) => !isSameFixedNote(entry.state?.state?.file, normalizedPath);
  for (const leaf of leaves) {
    const history = getLeafHistory(leaf);
    if (!history) continue;
    history.backHistory = history.backHistory.filter(isKept);
    history.forwardHistory = history.forwardHistory.filter(isKept);
  }
}
