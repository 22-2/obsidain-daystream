import type { TFile } from "obsidian";
import {
  buildFixedNotePathFromName,
  createNewFixedNote,
  ensureFixedNote,
  isMFDIFixedNotePath,
  normalizeFixedNotePath,
} from "src/core/fixed-note";
import { resolveNoteSource } from "src/core/note-source";
import { describe, expect, it, vi } from "vitest";

// テスト用の簡易的な File オブジェクト作成
const mockFile = (path: string) => ({ path }) as TFile;

describe("fixed note utilities", () => {
  it("パスの正規化と拡張子の判定", () => {
    // normalizeFixedNotePath (フォルダの正規化もここに含まれる)
    expect(normalizeFixedNotePath(" inbox/fixed-note ")).toBe("inbox/fixed-note.md");
    expect(normalizeFixedNotePath("inbox/fixed-note.md")).toBe("inbox/fixed-note.md");
    expect(normalizeFixedNotePath("   ")).toBe("");

    // isMFDIFixedNotePath
    expect(isMFDIFixedNotePath("MFDI/Untitled.mfdi.md")).toBe(true);
    expect(isMFDIFixedNotePath("MFDI/Untitled.MFDI.MD")).toBe(true);
    expect(isMFDIFixedNotePath("MFDI/Untitled.md")).toBe(false);
  });

  it("fixed mode でのノート解決", () => {
    const file = mockFile("notes/fixed.md");
    const shell = {
      getAbstractFileByPath: vi.fn((p) => (p === "notes/fixed.md" ? file : null)),
    } as any;

    const source = resolveNoteSource({
      shell,
      date: window.moment(),
      granularity: "day",
      activeTopic: "",
      noteMode: "fixed",
      file: "notes/fixed.md",
    });

    expect(source.resolveCurrentNote()).toBe(file);
  });

  it("ノートが存在しない場合はフォルダも含めて作成する", async () => {
    const file = mockFile("notes/fixed.md");
    const shell = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(),
      createFile: vi.fn(async () => file),
    } as any;

    const result = await ensureFixedNote(shell, "notes/fixed");

    expect(shell.createFolder).toHaveBeenCalledWith("notes");
    expect(shell.createFile).toHaveBeenCalledWith("notes/fixed.md", "");
    expect(result).toBe(file);
  });

  it("パス生成時に名前が重複したら連番を振る", () => {
    const shell = {
      getAbstractFileByPath: vi.fn((p) =>
        ["MFDI/Note.mfdi.md", "MFDI/Note 1.mfdi.md"].includes(p) ? {} : null,
      ),
    } as any;

    // 重複して 2 になるはず
    expect(buildFixedNotePathFromName("MFDI", "Note", shell)).toBe("MFDI/Note 2.mfdi.md");
    // 名前が空なら Untitled
    expect(buildFixedNotePathFromName("MFDI", "", shell)).toBe("MFDI/Untitled.mfdi.md");
    // フォルダなしならルート
    expect(buildFixedNotePathFromName("", "Root", shell)).toBe("Root.mfdi.md");
  });

  it("新しい固定ノート(Untitled)を生成する", async () => {
    const file = mockFile("MFDI/Untitled.mfdi.md");
    const shell = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(),
      createFile: vi.fn(async () => file),
    } as any;

    const result = await createNewFixedNote(shell, "MFDI");

    expect(shell.createFile).toHaveBeenCalledWith("MFDI/Untitled.mfdi.md", "");
    expect(result).toBe(file);
  });
});
