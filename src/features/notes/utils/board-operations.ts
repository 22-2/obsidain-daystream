import { Notice } from "obsidian";
import {
  isBoardContent,
  mergeBoardContents,
  moveBoardBlocks,
  parseBoardEntries,
  reorderBoardBlocks,
  type DropPlacement,
  type TextRange,
} from "src/core/board";
import { reportError } from "src/core/error-report";
import { trashFixedNote } from "src/core/fixed-note";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";

/** ドラッグ開始後にファイルが書き換わり、持っていた範囲が使えなくなった。 */
export class StaleBoardError extends Error {
  constructor() {
    super("ボードが更新されたため、操作をやり直してください");
    this.name = "StaleBoardError";
  }
}

async function loadBoard(shell: ObsidianAppShell, path: string): Promise<string> {
  const content = await shell.loadFile(path);
  if (!isBoardContent(content)) throw new Error(`ボードではありません: ${path}`);
  return content;
}

// 意図: offset はドラッグ開始時点のもの。今のファイルでもポストの境界に揃っているときだけ使い、
// ずれていたら別の文字列を切り取らないよう中断する。
function assertCurrentRanges(content: string, ranges: TextRange[]): void {
  const entries = parseBoardEntries(content);
  const starts = new Set(entries.map((entry) => entry.startOffset));
  const ends = new Set(entries.map((entry) => entry.endOffset));
  const isCurrent = ranges.every((range) => starts.has(range.startOffset) && ends.has(range.endOffset));
  if (!isCurrent) throw new StaleBoardError();
}

/** 同じボード内でポストを並べ替える。位置が変わらないときは null。 */
export async function reorderBoardPosts(
  shell: ObsidianAppShell,
  params: {
    path: string;
    moving: TextRange[];
    target: TextRange;
    placement: DropPlacement;
  },
): Promise<string | null> {
  const { path, moving, target, placement } = params;
  const content = await loadBoard(shell, path);
  assertCurrentRanges(content, [...moving, target]);

  const next = reorderBoardBlocks({ content, moving, target, placement });
  if (next === null || next === content) return null;

  await shell.writeFile(path, next);
  return next;
}

/** ポストを別ボードの先頭へ移す。書き込みは移動先 → 移動元の順で、途中で失敗しても投稿を失わない。 */
export async function movePostsToBoard(
  shell: ObsidianAppShell,
  params: { sourcePath: string; destPath: string; ranges: TextRange[] },
): Promise<void> {
  const { sourcePath, destPath, ranges } = params;
  if (sourcePath === destPath || ranges.length === 0) return;

  const sourceContent = await loadBoard(shell, sourcePath);
  const destContent = await loadBoard(shell, destPath);
  assertCurrentRanges(sourceContent, ranges);

  const moved = moveBoardBlocks({ sourceContent, destContent, moving: ranges });
  await shell.writeFile(destPath, moved.dest);
  await shell.writeFile(sourcePath, moved.source);
}

/** 移動元ボードのポストを移動先の末尾へ追記し、移動元をゴミ箱へ送る。 */
export async function mergeBoards(
  shell: ObsidianAppShell,
  params: { sourcePath: string; destPath: string },
): Promise<void> {
  const { sourcePath, destPath } = params;
  if (sourcePath === destPath) return;

  const sourceContent = await loadBoard(shell, sourcePath);
  const destContent = await loadBoard(shell, destPath);

  await shell.writeFile(destPath, mergeBoardContents(destContent, sourceContent));
  await trashFixedNote(shell, sourcePath);
}

/** 古いドラッグ元はそのまま通知し、それ以外は原因を残したうえで失敗を知らせる。 */
export function reportBoardOperationError(context: string, error: unknown): void {
  if (error instanceof StaleBoardError) {
    new Notice(error.message);
    return;
  }
  reportError({ context, error, notice: "ボードの操作に失敗しました" });
}
