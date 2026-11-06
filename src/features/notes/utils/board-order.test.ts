import { moveBoardInOrder, sortByBoardOrder } from "src/features/notes/utils/board-order";
import { describe, expect, it } from "vitest";

const board = (path: string) => ({ path, title: path });

describe("board order", () => {
  it("保存した順に並べ、記録のないボードは名前順で末尾に置く", () => {
    const sorted = sortByBoardOrder([board("c"), board("a"), board("z"), board("b")], ["b", "a"]);

    expect(sorted.map((item) => item.path)).toEqual(["b", "a", "c", "z"]);
  });

  it("動かすボードを対象の前後へ移す", () => {
    const paths = ["a", "b", "c"];

    expect(moveBoardInOrder({ paths, moving: "a", target: "c", placement: "after" })).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(moveBoardInOrder({ paths, moving: "c", target: "a", placement: "before" })).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
});
