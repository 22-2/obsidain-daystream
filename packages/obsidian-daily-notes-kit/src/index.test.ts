import { TFile } from "obsidian";
import type { TAbstractFile, TFolder, Vault } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAllNotes,
  getDateUID,
  getNote,
  getNoteSettings,
  resolveNotePath,
  type DailyNotesHost,
} from "./index";

// Mock Obsidian module before importing anything
const { recurseChildrenMock } = vi.hoisted(() => ({
  recurseChildrenMock: vi.fn<(folder: TFolder, callback: (node: TAbstractFile) => void) => void>(),
}));

vi.mock("obsidian", () => ({
  normalizePath: (p: string) => p,
  TFile: class {
    basename: string = "";
    extension: string = "";
    path: string = "";
  },
  TFolder: class {},
  Vault: {
    recurseChildren: recurseChildrenMock,
  },
}));

// ─────────────────────────────────────────────────────────────────
// Mock host
// ─────────────────────────────────────────────────────────────────
let communityPlugins: Record<string, unknown> = {};

function createHost(folder = "Daily"): DailyNotesHost {
  const vault = {
    getAbstractFileByPath: vi.fn(),
    getRoot: vi.fn(() => ({})),
    createFolder: vi.fn(),
    create: vi.fn(),
  };
  const internalPlugins: Record<string, unknown> = {
    "daily-notes": { instance: { options: { format: "YYYY-MM-DD", folder, template: "" } } },
  };

  return {
    getVault: () => vault as unknown as Vault,
    getCommunityPlugin: <T,>(id: string) => communityPlugins[id] as T | undefined,
    getInternalPluginById: <T,>(id: string) => internalPlugins[id] as T | undefined,
  };
}

function usePeriodicNotes(periodicity: string, format: string, folder: string) {
  communityPlugins = {
    "periodic-notes": {
      settings: { [periodicity]: { enabled: false, format, folder, template: "" } },
    },
  };
}

let host: DailyNotesHost;

beforeEach(() => {
  vi.clearAllMocks();
  communityPlugins = {};
  host = createHost("Daily");
});

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

describe("obsidian-daily-notes-kit", () => {
  describe("getDateUID", () => {
    it("granularity=day の UID を生成する", () => {
      const m = window.moment("2026-03-04");
      const uid = getDateUID(m);
      expect(uid).toMatch(/^day-/);
    });
  });

  describe("getNoteSettings", () => {
    it("day はコアプラグインの設定を取得できる", () => {
      const s = getNoteSettings(host, "day");
      expect(s.folder).toBe("Daily");
      expect(s.format).toBe("YYYY-MM-DD");
    });

    it("monthly は enabled=false でも periodic-notes の設定を使う", () => {
      usePeriodicNotes("monthly", "YYYY-MM", "Periodic/Monthly");

      const settings = getNoteSettings(host, "month");

      expect(settings.folder).toBe("Periodic/Monthly");
      expect(settings.format).toBe("YYYY-MM");
    });

    it("yearly は enabled=false でも periodic-notes の設定を使う", () => {
      usePeriodicNotes("yearly", "YYYY", "Periodic/Yearly");

      const settings = getNoteSettings(host, "year");

      expect(settings.folder).toBe("Periodic/Yearly");
      expect(settings.format).toBe("YYYY");
    });

    it("quarterly は enabled=false でも periodic-notes の設定を使う", () => {
      usePeriodicNotes("quarterly", "YYYY-[Q]Q", "Periodic/Quarterly");

      const settings = getNoteSettings(host, "quarter");

      expect(settings.folder).toBe("Periodic/Quarterly");
      expect(settings.format).toBe("YYYY-[Q]Q");
    });
  });

  describe("resolveNotePath", () => {
    it("prefix なしのパスを生成する", () => {
      const date = window.moment("2026-03-04");
      const path = resolveNotePath(host, date, "day");
      expect(path).toBe("Daily/2026-03-04.md");
    });

    it("prefix ありのパスを生成する", () => {
      const date = window.moment("2026-03-04");
      const path = resolveNotePath(host, date, "day", { prefix: "novel-" });
      expect(path).toBe("Daily/novel-2026-03-04.md");
    });

    it("month は periodic-notes の folder 設定を反映する", () => {
      usePeriodicNotes("monthly", "YYYY-MM", "Periodic/Monthly");

      const date = window.moment("2026-03-04");
      const path = resolveNotePath(host, date, "month");

      expect(path).toBe("Periodic/Monthly/2026-03.md");
    });

    it("quarter は periodic-notes の folder 設定を反映する", () => {
      usePeriodicNotes("quarterly", "YYYY-[Q]Q", "Periodic/Quarterly");

      const date = window.moment("2026-05-04");
      const path = resolveNotePath(host, date, "quarter");

      expect(path).toBe("Periodic/Quarterly/2026-Q2.md");
    });
  });

  describe("getAllNotes", () => {
    const mockFile = (basename: string, ext: string = "md") => {
      const f = new TFile();
      f.basename = basename;
      f.extension = ext;
      return f;
    };

    beforeEach(() => {
      const mockFiles = [
        mockFile("2026-03-01"), // prefix なし
        mockFile("novel-2026-03-02"), // novel- prefix
        mockFile("prog-2026-03-03"), // prog- prefix
        mockFile("invalid-file"), // 無効（日付なし）
        mockFile("2026-03-04", "txt"), // .md でない
      ];

      recurseChildrenMock.mockImplementation((_folder, callback) => {
        mockFiles.forEach((f) => callback(f));
      });
    });

    it("prefix なしでは prefix 付きのファイルを拾わない", () => {
      const result = getAllNotes(host, "day");
      expect(Object.keys(result)).toHaveLength(1);
      expect(Object.values(result)[0].basename).toBe("2026-03-01");
    });

    it("指定した prefix のファイルだけを取得する", () => {
      const result = getAllNotes(host, "day", { prefix: "novel-" });
      expect(Object.keys(result)).toHaveLength(1);
      expect(Object.values(result)[0].basename).toBe("novel-2026-03-02");
    });
  });

  describe("getNote", () => {
    it("ノートが存在すれば TFile を返し、なければ null を返す", () => {
      const f = new TFile();
      f.basename = "2026-03-01";
      f.extension = "md";

      recurseChildrenMock.mockImplementation((_folder, callback) => {
        callback(f);
      });

      const found = getNote(host, window.moment("2026-03-01"), "day");
      expect(found?.basename).toBe("2026-03-01");

      const notFound = getNote(host, window.moment("2099-12-31"), "day");
      expect(notFound).toBeNull();
    });
  });
});
