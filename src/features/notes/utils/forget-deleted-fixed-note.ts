import { normalizeFixedNotePath } from "src/core/fixed-note";
import {
  type FixedNoteLeafLike,
  isSameFixedNote,
  isShowingFixedNote,
  rewriteLeafHistory,
} from "src/features/notes/utils/fixed-note-leaves";

/**
 * 削除された固定ノートを、開いている leaf と各 leaf の戻る/進む履歴から取り除く。
 *
 * 意図: Daystream ビューは ItemView のため、Obsidian は削除済みファイルを
 * 履歴から除かない。残すと「戻る」で削除済みノートの空ビューが復元されてしまう。
 */
export async function forgetDeletedFixedNote(
  leaves: FixedNoteLeafLike[],
  deletedPath: string,
): Promise<void> {
  const normalizedPath = normalizeFixedNotePath(deletedPath);

  // Markdown ノートを削除したときと同様に、表示中の leaf は空タブにする。
  // setViewState は現在の表示を履歴へ積むため、履歴の掃除より先に行う。
  for (const leaf of leaves) {
    if (isShowingFixedNote(leaf, normalizedPath)) await leaf.setViewState({ type: "empty" });
  }

  rewriteLeafHistory(leaves, (entry) =>
    isSameFixedNote(entry.state?.state?.file, normalizedPath) ? null : entry,
  );
}
