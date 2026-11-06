import type { TextRange } from "src/core/board";

export const BOARD_POSTS_DRAG_TYPE = "application/x-dstr-board-posts";
export const BOARD_DRAG_TYPE = "application/x-dstr-board";

/** ドラッグが運ぶもの: ボード内のポスト(スレッド単位の範囲)か、ボード1つ。 */
export type BoardDragPayload =
  | { kind: "posts"; path: string; ranges: TextRange[] }
  | { kind: "board"; path: string };

// 意図: dragover の間はブラウザがデータを読ませないため、ホバー中の判定用に
// ドラッグ元の情報だけモジュールで保持する。drop 時は dataTransfer から読み直す。
let activeDrag: BoardDragPayload | null = null;

export function getActiveBoardDrag(): BoardDragPayload | null {
  return activeDrag;
}

export function clearActiveBoardDrag(): void {
  activeDrag = null;
}

export function startBoardDrag(
  dataTransfer: DataTransfer,
  payload: BoardDragPayload,
  label: string,
): void {
  activeDrag = payload;
  const type = payload.kind === "posts" ? BOARD_POSTS_DRAG_TYPE : BOARD_DRAG_TYPE;
  dataTransfer.setData(type, JSON.stringify(payload));
  dataTransfer.setData("text/plain", label);
  dataTransfer.effectAllowed = "move";
}

/** 型だけを見る。データは drop まで読めない。 */
export function hasBoardDragType(dataTransfer: DataTransfer): boolean {
  const types = Array.from(dataTransfer.types);
  return types.includes(BOARD_POSTS_DRAG_TYPE) || types.includes(BOARD_DRAG_TYPE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isTextRange(value: unknown): value is TextRange {
  return (
    isRecord(value) &&
    typeof value.startOffset === "number" &&
    typeof value.endOffset === "number"
  );
}

/** このプラグインが書いたペイロード以外は undefined を返す。 */
export function readBoardDragPayload(dataTransfer: DataTransfer): BoardDragPayload | undefined {
  const raw =
    dataTransfer.getData(BOARD_POSTS_DRAG_TYPE) || dataTransfer.getData(BOARD_DRAG_TYPE);
  if (!raw) return;

  try {
    const payload: unknown = JSON.parse(raw);
    if (!isRecord(payload) || typeof payload.path !== "string") return;
    if (payload.kind === "board") return { kind: "board", path: payload.path };
    if (payload.kind === "posts" && Array.isArray(payload.ranges)) {
      const ranges: unknown[] = payload.ranges;
      if (ranges.every(isTextRange)) return { kind: "posts", path: payload.path, ranges };
    }
  } catch {
    return;
  }
}
