import { createBoardContent, parseBoardEntries } from "src/core/board";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import {
  mergeBoards,
  movePostsToBoard,
  reorderBoardPosts,
  StaleBoardError,
} from "src/features/notes/utils/board-operations";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ trashFixedNote: vi.fn(async () => {}) }));

vi.mock("src/core/fixed-note", () => ({ trashFixedNote: mocks.trashFixedNote }));

const post = (time: string, message: string) => `- ${time} ${message}\n`;
const messages = (content: string) => parseBoardEntries(content).map((entry) => entry.message);

function createShell(files: Record<string, string>) {
  const writeFile = vi.fn(async (path: string, content: string) => {
    files[path] = content;
  });
  const shell = {
    loadFile: vi.fn(async (path: string) => files[path]),
    writeFile,
  } as unknown as ObsidianAppShell;
  return { shell, writeFile };
}

describe("board operations", () => {
  let files: Record<string, string>;

  beforeEach(() => {
    mocks.trashFixedNote.mockClear();
    files = {
      "a.dstr.md": createBoardContent() + post("03:00:00", "c") + post("02:00:00", "b") + post("01:00:00", "a"),
      "b.dstr.md": createBoardContent() + post("09:00:00", "x"),
      "plain.dstr.md": post("09:00:00", "not a board"),
    };
  });

  it("同じボード内で並べ替えて保存する", async () => {
    const { shell } = createShell(files);
    const [c, , a] = parseBoardEntries(files["a.dstr.md"]);

    const next = await reorderBoardPosts(shell, {
      path: "a.dstr.md",
      moving: [a],
      target: c,
      placement: "before",
    });

    expect(messages(next!)).toEqual(["a", "c", "b"]);
    expect(messages(files["a.dstr.md"])).toEqual(["a", "c", "b"]);
  });

  it("位置が変わらないときは書き込まない", async () => {
    const { shell, writeFile } = createShell(files);
    const [c, b] = parseBoardEntries(files["a.dstr.md"]);

    const next = await reorderBoardPosts(shell, {
      path: "a.dstr.md",
      moving: [c],
      target: b,
      placement: "before",
    });

    expect(next).toBeNull();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("ドラッグ開始後にファイルが変わっていたら中断する", async () => {
    const { shell, writeFile } = createShell(files);
    const [c, , a] = parseBoardEntries(files["a.dstr.md"]);
    files["a.dstr.md"] = files["a.dstr.md"].replace("- 03:00:00 c", "- 03:00:00 changed c");

    await expect(
      reorderBoardPosts(shell, { path: "a.dstr.md", moving: [a], target: c, placement: "before" }),
    ).rejects.toBeInstanceOf(StaleBoardError);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("ポストを別ボードの先頭へ移す。書き込みは移動先が先", async () => {
    const { shell, writeFile } = createShell(files);
    const [, b] = parseBoardEntries(files["a.dstr.md"]);

    await movePostsToBoard(shell, {
      sourcePath: "a.dstr.md",
      destPath: "b.dstr.md",
      ranges: [b],
    });

    expect(messages(files["b.dstr.md"])).toEqual(["b", "x"]);
    expect(messages(files["a.dstr.md"])).toEqual(["c", "a"]);
    expect(writeFile.mock.calls.map(([path]) => path)).toEqual(["b.dstr.md", "a.dstr.md"]);
  });

  it("ボードでないファイルへは移動しない", async () => {
    const { shell, writeFile } = createShell(files);
    const [c] = parseBoardEntries(files["a.dstr.md"]);

    await expect(
      movePostsToBoard(shell, { sourcePath: "a.dstr.md", destPath: "plain.dstr.md", ranges: [c] }),
    ).rejects.toThrow("ボードではありません");
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("マージは移動先の末尾へ追記してから移動元を削除する", async () => {
    const { shell } = createShell(files);

    await mergeBoards(shell, { sourcePath: "a.dstr.md", destPath: "b.dstr.md" });

    expect(messages(files["b.dstr.md"])).toEqual(["x", "c", "b", "a"]);
    expect(mocks.trashFixedNote).toHaveBeenCalledWith(shell, "a.dstr.md");
  });
});
