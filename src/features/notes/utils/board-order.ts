import type { DropPlacement } from "src/core/board";
import type { DSTRStorage } from "src/core/storage";

const BOARD_ORDER_STORAGE_KEY = "boardOrder";

type Listener = () => void;
const listeners = new Set<Listener>();

/** 並び順が変わったときに一覧を引き直すための購読。 */
export function subscribeBoardOrder(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readBoardOrder(storage: DSTRStorage): string[] {
  const stored = storage.get<unknown>(BOARD_ORDER_STORAGE_KEY, []);
  return Array.isArray(stored) ? stored.filter((value) => typeof value === "string") : [];
}

export function writeBoardOrder(storage: DSTRStorage, order: string[]): void {
  storage.set(BOARD_ORDER_STORAGE_KEY, order);
  listeners.forEach((listener) => listener());
}

/** 保存した順に並べる。順の記録がないボードは名前順で末尾に置く。 */
export function sortByBoardOrder<T extends { path: string; title: string }>(
  boards: T[],
  order: string[],
): T[] {
  const rank = new Map(order.map((path, index) => [path, index]));
  return [...boards].sort((left, right) => {
    const leftRank = rank.get(left.path) ?? Number.POSITIVE_INFINITY;
    const rightRank = rank.get(right.path) ?? Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.title.localeCompare(right.title, undefined, { numeric: true });
  });
}

/** 並べ替えた後の全ボードのパスの並び。動かすボードを対象の前後へ移す。 */
export function moveBoardInOrder(params: {
  paths: string[];
  moving: string;
  target: string;
  placement: DropPlacement;
}): string[] {
  const { paths, moving, target, placement } = params;
  const rest = paths.filter((path) => path !== moving);
  const targetIndex = rest.indexOf(target);
  if (targetIndex === -1) return paths;

  const insertAt = placement === "before" ? targetIndex : targetIndex + 1;
  return [...rest.slice(0, insertAt), moving, ...rest.slice(insertAt)];
}

/** 名前変更や移動でパスが変わっても、並び順の位置を引き継ぐ。 */
export function renameBoardInOrder(storage: DSTRStorage, oldPath: string, newPath: string): void {
  const order = readBoardOrder(storage);
  if (!order.includes(oldPath)) return;
  writeBoardOrder(
    storage,
    order.map((path) => (path === oldPath ? newPath : path)),
  );
}
