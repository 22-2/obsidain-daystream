import type { WorkspaceLeaf } from "obsidian";
import { normalizeFixedNotePath } from "src/core/fixed-note";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";
import { VIEW_TYPE_DSTR } from "src/core/view-types";

// 意図: leaf.history は Obsidian の非公開APIのため、実行時に構造を確かめてから触る。
// 項目は { state: { type, state: { file } }, eState } の形で保存されている。
type LeafHistoryEntry = { state?: { state?: { file?: unknown } } };
type LeafHistory = { backHistory: LeafHistoryEntry[]; forwardHistory: LeafHistoryEntry[] };

const DSTR_VIEW_TYPES = new Set<string>([VIEW_TYPE_DSTR, LEGACY_DAYSTREAM_IDENTIFIERS.viewType]);

function getLeafHistory(leaf: WorkspaceLeaf): LeafHistory | null {
  const history = (leaf as WorkspaceLeaf & { history?: Partial<LeafHistory> }).history;
  if (!Array.isArray(history?.backHistory) || !Array.isArray(history?.forwardHistory)) return null;
  return history as LeafHistory;
}

function isSameFixedNote(file: unknown, normalizedPath: string): boolean {
  return typeof file === "string" && normalizeFixedNotePath(file) === normalizedPath;
}

function isShowingFixedNote(leaf: WorkspaceLeaf, normalizedPath: string): boolean {
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
  leaves: WorkspaceLeaf[],
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
