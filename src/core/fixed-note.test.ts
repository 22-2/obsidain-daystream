import type { TFile } from "obsidian";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";
import {
  buildFixedNotePathFromName,
  createNewFixedNote,
  ensureFixedNote,
  isDSTRFixedNotePath,
  normalizeFixedNotePath,
  renameFixedNote,
  trashFixedNote,
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

    // isDSTRFixedNotePath
    expect(isDSTRFixedNotePath("dstr/Untitled.dstr.md")).toBe(true);
    expect(isDSTRFixedNotePath("dstr/Untitled.dstr.MD")).toBe(true);
    expect(
      isDSTRFixedNotePath(`archive/Untitled${LEGACY_DAYSTREAM_IDENTIFIERS.fixedNoteSuffix}`),
    ).toBe(true);
    expect(isDSTRFixedNotePath("dstr/Untitled.md")).toBe(false);
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
        ["dstr/Note.dstr.md", "dstr/Note 1.dstr.md"].includes(p) ? {} : null,
      ),
    } as any;

    // 重複して 2 になるはず
    expect(buildFixedNotePathFromName("dstr", "Note", shell)).toBe("dstr/Note 2.dstr.md");
    // 名前が空なら Untitled
    expect(buildFixedNotePathFromName("dstr", "", shell)).toBe("dstr/Untitled.dstr.md");
    // フォルダなしならルート
    expect(buildFixedNotePathFromName("", "Root", shell)).toBe("Root.dstr.md");
  });

  it("新しい固定ノート(Untitled)を生成する", async () => {
    const file = mockFile("dstr/Untitled.dstr.md");
    const shell = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(),
      createFile: vi.fn(async () => file),
    } as any;

    const result = await createNewFixedNote(shell, "dstr");

    expect(shell.createFile).toHaveBeenCalledWith("dstr/Untitled.dstr.md", "");
    expect(result).toBe(file);
  });

  it("固定ノートのリネームと削除を共通操作へ委譲する", async () => {
    const file = mockFile("dstr/Inbox.dstr.md");
    const renameFile = vi.fn(async () => undefined);
    const trashFile = vi.fn(async () => undefined);
    const shell = {
      getAbstractFileByPath: vi.fn(() => file),
      getFileManager: vi.fn(() => ({ renameFile, trashFile })),
    } as any;

    const path = await renameFixedNote(shell, file.path, " Renamed ");
    await trashFixedNote(shell, file.path);

    expect(renameFile).toHaveBeenCalledWith(file, "Renamed.dstr.md");
    expect(trashFile).toHaveBeenCalledWith(file);
    expect(path).toBe(file.path);
  });
});
