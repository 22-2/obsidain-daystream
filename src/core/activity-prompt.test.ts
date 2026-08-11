import type { TFile } from "obsidian";
import { saveActivityPromptResponse } from "src/core/activity-prompt";
import type { Settings } from "src/settings";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveNoteSource: vi.fn(),
  indexNoteContent: vi.fn(),
  noteSource: {
    resolveCurrentNote: vi.fn(),
    ensureCurrentNote: vi.fn(),
  },
}));

vi.mock("src/core/note-source", () => ({
  resolveNoteSource: mocks.resolveNoteSource,
}));

vi.mock("src/db/indexer/tag-indexer", () => ({
  indexNoteContent: mocks.indexNoteContent,
}));

describe("saveActivityPromptResponse", () => {
  const note = { path: "daily/2026-08-11.md" } as TFile;
  const settings = {
    activeTopic: "work",
    insertAfter: "## Thino",
  } as Settings;
  const insertTextAfterEnsuringMarker = vi.fn(async () => "updated content");
  const trigger = vi.fn();
  const shell = {
    insertTextAfterEnsuringMarker,
    trigger,
  } as unknown as ObsidianAppShell;
  const now = window.moment("2026-08-11T11:30:00+09:00");

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveNoteSource.mockReturnValue(mocks.noteSource);
    mocks.noteSource.resolveCurrentNote.mockReturnValue(note);
    mocks.noteSource.ensureCurrentNote.mockResolvedValue(note);
    mocks.indexNoteContent.mockResolvedValue(undefined);
  });

  it("入力を今日の日次ノートへ保存してインデックスを更新する", async () => {
    const result = await saveActivityPromptResponse({
      shell,
      settings,
      input: "実装中",
      now,
    });

    expect(mocks.resolveNoteSource).toHaveBeenCalledWith(
      expect.objectContaining({
        shell,
        date: now,
        granularity: "day",
        activeTopic: "work",
        noteMode: "periodic",
        file: null,
      }),
    );
    expect(insertTextAfterEnsuringMarker).toHaveBeenCalledWith(
      note,
      "- 11:30:00 実装中\n",
      "## Thino",
    );
    expect(mocks.indexNoteContent).toHaveBeenCalledWith(
      shell,
      note,
      settings,
      "updated content",
    );
    expect(trigger).toHaveBeenCalledWith("mfdi:scroll-to-top");
    expect(result).toEqual({ notePath: note.path, indexError: null });
  });

  it("今日のノートがなければ作成してから保存する", async () => {
    mocks.noteSource.resolveCurrentNote.mockReturnValue(null);

    await saveActivityPromptResponse({
      shell,
      settings,
      input: "調査中",
      now,
    });

    expect(mocks.noteSource.ensureCurrentNote).toHaveBeenCalledTimes(1);
    expect(insertTextAfterEnsuringMarker).toHaveBeenCalledWith(
      note,
      "- 11:30:00 調査中\n",
      "## Thino",
    );
  });

  it("保存後のインデックス更新失敗は再投稿させず結果として返す", async () => {
    const indexError = new Error("index failed");
    mocks.indexNoteContent.mockRejectedValue(indexError);

    await expect(
      saveActivityPromptResponse({
        shell,
        settings,
        input: "レビュー中",
        now,
      }),
    ).resolves.toEqual({ notePath: note.path, indexError });
  });

  it("空入力はノートへ書き込まない", async () => {
    await expect(
      saveActivityPromptResponse({ shell, settings, input: "  ", now }),
    ).rejects.toThrow("空の活動記録は保存できません");

    expect(insertTextAfterEnsuringMarker).not.toHaveBeenCalled();
  });
});
