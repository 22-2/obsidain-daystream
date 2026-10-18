import type { WorkspaceLeaf } from "obsidian";
import { normalizeFixedNotePath } from "src/core/fixed-note";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";
import { VIEW_TYPE_DSTR } from "src/core/view-types";

// 意図: leaf.history は Obsidian の非公開APIのため、実行時に構造を確かめてから触る。
// 項目は { state: { type, state: { file } }, eState } の形で保存されている。
export type LeafHistoryEntry = { state?: { state?: { file?: unknown } } };
type LeafHistory = { backHistory: LeafHistoryEntry[]; forwardHistory: LeafHistoryEntry[] };

const DSTR_VIEW_TYPES = new Set<string>([VIEW_TYPE_DSTR, LEGACY_DAYSTREAM_IDENTIFIERS.viewType]);

// 意図: 固定ノートの追従処理が触るのは view state と履歴だけなので、必要な形だけを要求する。
// history の型は Obsidian の型定義と食い違うため unknown にして、使う前に形を確かめる。
export type FixedNoteLeafLike = Pick<WorkspaceLeaf, "getViewState" | "setViewState"> & {
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

export function isSameFixedNote(file: unknown, normalizedPath: string): boolean {
  return typeof file === "string" && normalizeFixedNotePath(file) === normalizedPath;
}

export function isShowingFixedNote(leaf: FixedNoteLeafLike, normalizedPath: string): boolean {
  const viewState = leaf.getViewState();
  return DSTR_VIEW_TYPES.has(viewState.type) && isSameFixedNote(viewState.state?.file, normalizedPath);
}

/** 各 leaf の戻る/進む履歴の項目を、渡した関数の結果で置き換える。null を返した項目は取り除く。 */
export function rewriteLeafHistory(
  leaves: FixedNoteLeafLike[],
  rewrite: (entry: LeafHistoryEntry) => LeafHistoryEntry | null,
): void {
  const rewriteEntries = (entries: LeafHistoryEntry[]) =>
    entries.map(rewrite).filter((entry): entry is LeafHistoryEntry => entry !== null);

  for (const leaf of leaves) {
    if (!isLeafHistory(leaf.history)) continue;
    leaf.history.backHistory = rewriteEntries(leaf.history.backHistory);
    leaf.history.forwardHistory = rewriteEntries(leaf.history.forwardHistory);
  }
}
