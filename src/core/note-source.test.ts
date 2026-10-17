import type { Granularity } from "src/core/domain/granularity";
import type { MomentLike } from "src/core/domain/post";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import {
  collectPeriodicNoteEntries,
  createFixedNoteFromInput,
  resolveNoteSource,
  searchPeriodicDayWindow,
} from "src/core/note-source";
import { createFakeShell, createFakeTFile } from "src/core/test-fixtures";
import { obsidianMoment } from "src/core/platform/obsidian-globals";
import type { TFile } from "obsidian";
import { describe, expect, it, vi } from "vitest";

vi.mock("src/core/platform/daily-notes", () => ({
  getTopicNote: vi.fn((shell: ObsidianAppShell, date: MomentLike) =>
    shell.getAbstractFileByPath(["daily", date.format("YYYY-MM-DD") + ".md"].join("/")),
  ),
  createTopicNote: vi.fn(async (shell: ObsidianAppShell) =>
    shell.createFile("daily/2026-03-15.md", ""),
  ),
  getAllTopicNotes: vi.fn((_shell: ObsidianAppShell, _g: Granularity, _topicId: string) => ({
    "day-2026-03-15": createFakeTFile("daily/2026-03-15.md"),
    "day-2026-03-10": createFakeTFile("daily/2026-03-10.md"),
    "day-2026-03-09": createFakeTFile("daily/2026-03-09.md"),
  })),
  getDateUID: vi.fn((date: MomentLike, granularity: Granularity) =>
    [granularity, date.format("YYYY-MM-DD")].join("-"),
  ),
  getDateFromFile: vi.fn((file: TFile) =>
    obsidianMoment(file.path.match(/\d{4}-\d{2}-\d{2}/)?.[0]),
  ),
  resolveTopicNotePath: vi.fn(() => "daily/2026-03-15.md"),
}));

describe("resolveNoteSource", () => {
  const dailyFile = createFakeTFile("daily/2026-03-15.md");
  const fixedFile = createFakeTFile("dstr/Inbox.dstr.md", "Inbox.dstr");

  const createFile = vi.fn(async (path: string) => createFakeTFile(path));
  const shell = createFakeShell({
    getAbstractFileByPath: vi.fn((path: string) => {
      if (path === dailyFile.path) return dailyFile;
      if (path === fixedFile.path) return fixedFile;
      return null;
    }),
    createFolder: vi.fn(async () => {}),
    createFile,
  });

  it("resolves periodic notes by path and context", () => {
    const source = resolveNoteSource({
      shell,
      date: obsidianMoment("2026-03-15T00:00:00.000Z"),
      granularity: "day",
      activeTopic: "",
      noteMode: "periodic",
      file: null,
    });

    expect(source.mode).toBe("periodic");
    expect(source.resolveCurrentNote()).toBe(dailyFile);
    expect(source.matchesPath(dailyFile.path)).toBe(true);
  });

  it("resolves fixed notes from fixed path", () => {
    const source = resolveNoteSource({
      shell,
      date: obsidianMoment("2026-03-15T00:00:00.000Z"),
      granularity: "day",
      activeTopic: "",
      noteMode: "fixed",
      file: "dstr/Inbox.dstr.md",
    });

    expect(source.mode).toBe("fixed");
    expect(source.resolveCurrentNote()).toBe(fixedFile);
    expect(source.matchesPath(fixedFile.path)).toBe(true);
  });

  it("creates a fixed note from user input through the core helper", async () => {
    const created = await createFixedNoteFromInput(shell, "dstr", "Scratch");

    expect(createFile).toHaveBeenCalledWith("dstr/Scratch.dstr.md", "");
    expect(created.path).toBe("dstr/Scratch.dstr.md");
  });

  it("collects periodic entries for explicit dates", () => {
    const dates = [
      obsidianMoment("2026-03-15T00:00:00.000Z"),
      obsidianMoment("2026-03-14T00:00:00.000Z"),
    ];

    const entries = collectPeriodicNoteEntries(shell, "day", "", dates);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.file.path).toBe("daily/2026-03-15.md");
  });

  it("jumps across empty gaps when searching periodic windows", () => {
    const result = searchPeriodicDayWindow({
      shell,
      activeTopic: "",
      baseDate: obsidianMoment("2026-03-14T00:00:00.000Z"),
      days: 2,
    });

    expect(result.entries.map((entry) => entry.file.path)).toEqual([
      "daily/2026-03-10.md",
      "daily/2026-03-09.md",
    ]);
    expect(result.lastSearchedDate.format("YYYY-MM-DD")).toBe("2026-03-09");
    expect(result.hasMore).toBe(false);
  });
});
