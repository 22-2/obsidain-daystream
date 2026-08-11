import { TFile } from "obsidian";
import {
  collectPeriodicNoteEntries,
  createFixedNoteFromInput,
  resolveNoteSource,
  searchPeriodicDayWindow,
} from "src/core/note-source";
import { describe, expect, it, vi } from "vitest";

vi.mock("src/lib/daily-notes", () => ({
  getTopicNote: vi.fn((shell: any, date: any, _g: any, _topicId: any) =>
    shell.getAbstractFileByPath(`daily/${date.format("YYYY-MM-DD")}.md`),
  ),
  createTopicNote: vi.fn(async (shell: any, _date: any, _g: any, _topicId: any) =>
    shell.createFile("daily/2026-03-15.md", ""),
  ),
  getAllTopicNotes: vi.fn((_shell: any, _g: any, _topicId: any) => ({
    "day-2026-03-15": Object.assign(new TFile(), {
      path: "daily/2026-03-15.md",
      basename: "2026-03-15",
      extension: "md",
    }),
    "day-2026-03-10": Object.assign(new TFile(), {
      path: "daily/2026-03-10.md",
      basename: "2026-03-10",
      extension: "md",
    }),
    "day-2026-03-09": Object.assign(new TFile(), {
      path: "daily/2026-03-09.md",
      basename: "2026-03-09",
      extension: "md",
    }),
  })),
  getDateUID: vi.fn(
    (date: any, granularity: string) => `${granularity}-${date.format("YYYY-MM-DD")}`,
  ),
  getDateFromFile: vi.fn((file: TFile) => window.moment(file.path.match(/\d{4}-\d{2}-\d{2}/)?.[0])),
  resolveTopicNotePath: vi.fn(() => "daily/2026-03-15.md"),
}));

describe("resolveNoteSource", () => {
  const dailyFile = Object.assign(new TFile(), {
    path: "daily/2026-03-15.md",
    basename: "2026-03-15",
    extension: "md",
  });
  const fixedFile = Object.assign(new TFile(), {
    path: "MFDI/Inbox.mfdi.md",
    basename: "Inbox.mfdi",
    extension: "md",
  });

  const shell = {
    getAbstractFileByPath: vi.fn((path: string) => {
      if (path === dailyFile.path) return dailyFile;
      if (path === fixedFile.path) return fixedFile;
      return null;
    }),
    createFolder: vi.fn(async () => {}),
    createFile: vi.fn(async (path: string) =>
      Object.assign(new TFile(), { path, basename: path, extension: "md" }),
    ),
  } as any;

  it("resolves periodic notes by path and context", () => {
    const source = resolveNoteSource({
      shell,
      date: window.moment("2026-03-15T00:00:00.000Z"),
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
      date: window.moment("2026-03-15T00:00:00.000Z"),
      granularity: "day",
      activeTopic: "",
      noteMode: "fixed",
      file: "MFDI/Inbox.mfdi.md",
    });

    expect(source.mode).toBe("fixed");
    expect(source.resolveCurrentNote()).toBe(fixedFile);
    expect(source.matchesPath(fixedFile.path)).toBe(true);
  });

  it("creates a fixed note from user input through the core helper", async () => {
    const created = await createFixedNoteFromInput(shell, "MFDI", "Scratch");

    expect(shell.createFile).toHaveBeenCalledWith("MFDI/Scratch.mfdi.md", "");
    expect(created.path).toBe("MFDI/Scratch.mfdi.md");
  });

  it("collects periodic entries for explicit dates", () => {
    const dates = [
      window.moment("2026-03-15T00:00:00.000Z"),
      window.moment("2026-03-14T00:00:00.000Z"),
    ];

    const entries = collectPeriodicNoteEntries(shell, "day", "", dates);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.file.path).toBe("daily/2026-03-15.md");
  });

  it("jumps across empty gaps when searching periodic windows", () => {
    const result = searchPeriodicDayWindow({
      shell,
      activeTopic: "",
      baseDate: window.moment("2026-03-14T00:00:00.000Z"),
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
