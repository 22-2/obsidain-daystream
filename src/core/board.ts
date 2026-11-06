import { collapseExcessBlankLines } from "src/core/post-utils";
import { parseThinoEntries, type ThinoEntry } from "src/core/thino";

// 意図: ボードは fixed ノートの一種。拡張子は増やさず、フロントマターで session 管理なしの
// 「ポストを自由に積むファイル」だと示す。他の場所で開いても普通のメモとして読める。
export const BOARD_FRONTMATTER_KEY = "dstr-board";

const FRONTMATTER_PATTERN = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const BOARD_FLAG_PATTERN = new RegExp(`^${BOARD_FRONTMATTER_KEY}:\\s*true\\s*$`, "m");

export interface TextRange {
  startOffset: number;
  endOffset: number;
}

export type DropPlacement = "before" | "after";

function readFrontmatter(content: string): { body: string; endOffset: number } | null {
  const match = FRONTMATTER_PATTERN.exec(content);
  return match ? { body: match[1], endOffset: match[0].length } : null;
}

export function isBoardContent(content: string): boolean {
  const frontmatter = readFrontmatter(content);
  return frontmatter !== null && BOARD_FLAG_PATTERN.test(frontmatter.body);
}

export function createBoardContent(): string {
  return `---\n${BOARD_FRONTMATTER_KEY}: true\n---\n`;
}

/** ポスト領域の開始位置。フロントマターの直後。 */
function getBoardBodyStart(content: string): number {
  return readFrontmatter(content)?.endOffset ?? 0;
}

/** 新しいポストを挿入する目印。フロントマター全体を指し、先頭に新しい投稿を積む。 */
export function getBoardInsertMarker(content: string): string {
  return content.slice(0, getBoardBodyStart(content)).trimEnd();
}

export function parseBoardEntries(content: string): ThinoEntry[] {
  const bodyStart = getBoardBodyStart(content);
  return parseThinoEntries(content.slice(bodyStart), {
    startInSection: true,
    offsetBase: bodyStart,
  });
}

function withTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function sortRanges(ranges: TextRange[]): TextRange[] {
  return [...ranges].sort((left, right) => left.startOffset - right.startOffset);
}

/** 範囲群を取り除いた本文と、取り除いたテキスト(元の順)を返す。 */
function extractRanges(content: string, ranges: TextRange[]): { rest: string; taken: string } {
  const sorted = sortRanges(ranges);
  let rest = "";
  let taken = "";
  let cursor = 0;
  for (const range of sorted) {
    rest += content.slice(cursor, range.startOffset);
    taken += withTrailingNewline(content.slice(range.startOffset, range.endOffset));
    cursor = range.endOffset;
  }
  rest += content.slice(cursor);
  return { rest, taken };
}

/**
 * 移動するブロックを、対象ブロックの前後へ並べ替える。
 * ドロップ位置が移動するブロック自身の内側なら何もしないので null を返す。
 */
export function reorderBoardBlocks(params: {
  content: string;
  moving: TextRange[];
  target: TextRange;
  placement: DropPlacement;
}): string | null {
  const { content, moving, target, placement } = params;
  if (moving.length === 0) return null;

  const insertAt = placement === "before" ? target.startOffset : target.endOffset;
  const overlapsMoving = moving.some(
    (range) => insertAt > range.startOffset && insertAt < range.endOffset,
  );
  const targetIsMoving = moving.some(
    (range) => target.startOffset >= range.startOffset && target.endOffset <= range.endOffset,
  );
  if (overlapsMoving || targetIsMoving) return null;

  const { rest, taken } = extractRanges(content, moving);
  const removedBeforeInsert = moving
    .filter((range) => range.endOffset <= insertAt)
    .reduce((sum, range) => sum + (range.endOffset - range.startOffset), 0);
  const adjustedInsertAt = insertAt - removedBeforeInsert;

  const head = rest.slice(0, adjustedInsertAt);
  const needsLeadingBreak = head.length > 0 && !head.endsWith("\n");
  return (
    head + (needsLeadingBreak ? "\n" : "") + taken + rest.slice(adjustedInsertAt)
  );
}

/** 別ボードの先頭へブロックを移す。戻り値は書き込む順(移動先 → 移動元)で使う。 */
export function moveBoardBlocks(params: {
  sourceContent: string;
  destContent: string;
  moving: TextRange[];
}): { source: string; dest: string } {
  const { sourceContent, destContent, moving } = params;
  const { rest, taken } = extractRanges(sourceContent, moving);

  const bodyStart = getBoardBodyStart(destContent);
  const head = destContent.slice(0, bodyStart);
  const headWithBreak = head.length > 0 ? withTrailingNewline(head) : head;
  return {
    source: collapseExcessBlankLines(rest),
    dest: headWithBreak + taken + destContent.slice(bodyStart),
  };
}

/** 移動元ボードのポスト領域を、移動先ボードの末尾へ追記する。 */
export function mergeBoardContents(destContent: string, sourceContent: string): string {
  const sourceBody = sourceContent.slice(getBoardBodyStart(sourceContent)).trim();
  if (!sourceBody) return destContent;
  return `${withTrailingNewline(destContent.trimEnd())}${sourceBody}\n`;
}

/**
 * 並べ替えをしても順序が変わらない位置かどうか。ドラッグ中のブロックの直前・直後・内側へ
 * ドロップしても何も変わらないので、その位置には挿入線を出さない。
 * `blocks` は全ブロックをファイル内の順に並べたもの。散らばったブロックは常に動く。
 */
export function isBoardMoveNoop(params: {
  blocks: TextRange[];
  moving: TextRange[];
  target: TextRange;
  placement: DropPlacement;
}): boolean {
  const { moving, target, placement } = params;
  const blocks = sortRanges(params.blocks);
  const isMoving = (range: TextRange) =>
    moving.some(
      (candidate) =>
        candidate.startOffset <= range.startOffset && range.endOffset <= candidate.endOffset,
    );
  const movingBlocks = blocks.filter(isMoving);
  if (movingBlocks.length === 0) return false;

  const rest = blocks.filter((range) => !isMoving(range));
  const anchor =
    placement === "before"
      ? rest.findIndex((range) => range.startOffset >= target.startOffset)
      : rest.findLastIndex((range) => range.endOffset <= target.endOffset);
  const insertAt = placement === "before" ? (anchor === -1 ? rest.length : anchor) : anchor + 1;
  const result = [...rest.slice(0, insertAt), ...movingBlocks, ...rest.slice(insertAt)];
  return result.every((range, index) => range === blocks[index]);
}

