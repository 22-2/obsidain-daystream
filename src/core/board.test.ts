import {
  createBoardContent,
  isBoardMoveNoop,
  getBoardInsertMarker,
  isBoardContent,
  mergeBoardContents,
  moveBoardBlocks,
  parseBoardEntries,
  reorderBoardBlocks,
} from "src/core/board";
import { ensureFixedSessionHeading, parseFixedSessionSections } from "src/core/fixed-sessions";
import { describe, expect, it } from "vitest";

const board = (...posts: string[]) => createBoardContent() + posts.join("");
const post = (time: string, message: string) => `- ${time} ${message}\n`;

describe("board", () => {
  it("フロントマターの dstr-board: true だけをボードと判定する", () => {
    expect(isBoardContent(createBoardContent())).toBe(true);
    expect(isBoardContent("---\ntitle: x\ndstr-board: true\n---\n- 09:00:00 a\n")).toBe(true);
    expect(isBoardContent("---\ndstr-board: false\n---\n")).toBe(false);
    expect(isBoardContent("- 09:00:00 a\n")).toBe(false);
    expect(isBoardContent("# dstr-board: true\n")).toBe(false);
  });

  it("見出しなしでポストを読み、offset は元の文字列を指す", () => {
    const content = board(post("09:00:00", "first"), post("08:00:00", "second"));
    const entries = parseBoardEntries(content);

    expect(entries.map((entry) => entry.message)).toEqual(["first", "second"]);
    expect(content.slice(entries[1].startOffset, entries[1].endOffset)).toBe(
      post("08:00:00", "second"),
    );
  });

  it("fixed の session 解析ではファイル全体を session 1 として扱う", () => {
    const content = board(post("09:00:00", "first"));
    const sections = parseFixedSessionSections(content, "## Thino");

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ sessionNumber: 1, isLegacyHeading: false });
    expect(sections[0].entries).toHaveLength(1);
  });

  it("投稿はフロントマターの直後に積まれ、見出しは追加されない", () => {
    const content = board(post("08:00:00", "old"));
    const { nextContent, headingLine } = ensureFixedSessionHeading({
      content,
      insertAfter: "## Thino",
      sessionNumber: 1,
    });

    expect(nextContent).toBe(content);
    expect(headingLine).toBe(getBoardInsertMarker(content));
    expect(content.startsWith(headingLine)).toBe(true);
  });

  describe("reorderBoardBlocks", () => {
    const content = board(post("03:00:00", "c"), post("02:00:00", "b"), post("01:00:00", "a"));
    const [c, b, a] = parseBoardEntries(content);
    const order = (text: string) => parseBoardEntries(text).map((entry) => entry.message);

    it("下のポストを別のポストの前へ移す", () => {
      const next = reorderBoardBlocks({
        content,
        moving: [a],
        target: c,
        placement: "before",
      });
      expect(order(next!)).toEqual(["a", "c", "b"]);
    });

    it("上のポストを別のポストの後ろへ移す", () => {
      const next = reorderBoardBlocks({
        content,
        moving: [c],
        target: a,
        placement: "after",
      });
      expect(order(next!)).toEqual(["b", "a", "c"]);
    });

    it("複数のブロックを元の順のままひとまとまりで移す", () => {
      const next = reorderBoardBlocks({
        content,
        moving: [c, b],
        target: a,
        placement: "after",
      });
      expect(order(next!)).toEqual(["a", "c", "b"]);
    });

    it("自分自身へのドロップは何もしない", () => {
      expect(reorderBoardBlocks({ content, moving: [b], target: b, placement: "after" })).toBeNull();
    });

    it("末尾に改行がなくても行が連結されない", () => {
      const noTrailing = content.trimEnd();
      const [first, , last] = parseBoardEntries(noTrailing);
      const next = reorderBoardBlocks({
        content: noTrailing,
        moving: [first],
        target: last,
        placement: "after",
      });
      expect(order(next!)).toEqual(["b", "a", "c"]);
    });
  });

  it("ブロックを別ボードの先頭へ移し、移動元から取り除く", () => {
    const source = board(post("02:00:00", "b"), post("01:00:00", "a"));
    const dest = board(post("09:00:00", "x"));
    const [b] = parseBoardEntries(source);

    const moved = moveBoardBlocks({ sourceContent: source, destContent: dest, moving: [b] });

    expect(parseBoardEntries(moved.source).map((entry) => entry.message)).toEqual(["a"]);
    expect(parseBoardEntries(moved.dest).map((entry) => entry.message)).toEqual(["b", "x"]);
    expect(isBoardContent(moved.dest)).toBe(true);
  });

  it("マージは移動元のポストを移動先の末尾へ追記する", () => {
    const dest = board(post("09:00:00", "x"));
    const source = board(post("02:00:00", "b"), post("01:00:00", "a"));

    const merged = mergeBoardContents(dest, source);

    expect(parseBoardEntries(merged).map((entry) => entry.message)).toEqual(["x", "b", "a"]);
    expect(merged.match(/dstr-board/g)).toHaveLength(1);
  });

  it("空のボードをマージしても移動先は変わらない", () => {
    const dest = board(post("09:00:00", "x"));
    expect(mergeBoardContents(dest, createBoardContent())).toBe(dest);
  });
});

describe("isBoardMoveNoop", () => {
  const content = board(post("03:00:00", "c"), post("02:00:00", "b"), post("01:00:00", "a"));
  const entries = parseBoardEntries(content);
  const [c, b, a] = entries;

  it("移動中のポストの直前・直後は変化しない", () => {
    const params = { blocks: entries, moving: [b] };
    expect(isBoardMoveNoop({ ...params, target: c, placement: "after" })).toBe(true);
    expect(isBoardMoveNoop({ ...params, target: a, placement: "before" })).toBe(true);
  });

  it("別の位置へ動かすなら変化する", () => {
    const params = { blocks: entries, moving: [b] };
    expect(isBoardMoveNoop({ ...params, target: c, placement: "before" })).toBe(false);
    expect(isBoardMoveNoop({ ...params, target: a, placement: "after" })).toBe(false);
  });

  it("連続した複数ブロックはひとまとまりとして扱う", () => {
    const params = { blocks: entries, moving: [c, b] };
    expect(isBoardMoveNoop({ ...params, target: a, placement: "before" })).toBe(true);
    expect(isBoardMoveNoop({ ...params, target: a, placement: "after" })).toBe(false);
  });
});

