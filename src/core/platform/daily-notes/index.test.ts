import { TFile, Vault } from "obsidian";
import {
  getAllTopicNotes,
  getDailyNoteSettings,
  getDateUID,
  getMonthlyNoteSettings,
  getQuarterlyNoteSettings,
  getTopicNote,
  getYearlyNoteSettings,
  resolveTopicNotePath,
} from "src/core/platform/daily-notes/index";
import { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Obsidian module before importing anything
vi.mock("obsidian", () => ({
  normalizePath: (p: string) => p,
  TFile: class {
    basename: string = "";
    extension: string = "";
    path: string = "";
  },
  TFolder: class {},
  Vault: {
    recurseChildren: vi.fn(),
  },
}));

// ─────────────────────────────────────────────────────────────────
// Mock Obsidian App
// ─────────────────────────────────────────────────────────────────
function setupApp(folder = "Daily") {
  (window as any).app = {
    vault: {
      getAbstractFileByPath: vi.fn(),
      getRoot: vi.fn(() => ({})),
      recurseChildren: (Vault as any).recurseChildren,
      createFolder: vi.fn(),
      create: vi.fn(),
    },
    plugins: {
      getPlugin: vi.fn(() => null),
    },
    internalPlugins: {
      getPluginById: vi.fn(() => ({
        instance: { options: { format: "YYYY-MM-DD", folder, template: "" } },
      })),
    },
  };
}

function getShell() {
  return new ObsidianAppShell((window as any).app);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupApp("Daily");
});

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

describe("daily-notes-interface utility", () => {
  describe("getDateUID", () => {
    it("granularity=day の UID を生成する", () => {
      const m = window.moment("2026-03-04");
      const uid = getDateUID(m);
      expect(uid).toMatch(/^day-/);
    });
  });

  describe("getDailyNoteSettings", () => {
    it("コアプラグインの設定を取得できる", () => {
      const s = getDailyNoteSettings(getShell());
      expect(s.folder).toBe("Daily");
      expect(s.format).toBe("YYYY-MM-DD");
    });
  });

  describe("periodic settings", () => {
    it("monthly は enabled=false でも periodic-notes の設定を使う", () => {
      (window as any).app.plugins.getPlugin = vi.fn((id: string) => {
        if (id === "periodic-notes") {
          return {
            settings: {
              monthly: {
                enabled: false,
                format: "YYYY-MM",
                folder: "Periodic/Monthly",
                template: "",
              },
            },
          };
        }
        return null;
      });

      const settings = getMonthlyNoteSettings(getShell());

      expect(settings.folder).toBe("Periodic/Monthly");
      expect(settings.format).toBe("YYYY-MM");
    });

    it("yearly は enabled=false でも periodic-notes の設定を使う", () => {
      (window as any).app.plugins.getPlugin = vi.fn((id: string) => {
        if (id === "periodic-notes") {
          return {
            settings: {
              yearly: {
                enabled: false,
                format: "YYYY",
                folder: "Periodic/Yearly",
                template: "",
              },
            },
          };
        }
        return null;
      });

      const settings = getYearlyNoteSettings(getShell());

      expect(settings.folder).toBe("Periodic/Yearly");
      expect(settings.format).toBe("YYYY");
    });

    it("quarterly は enabled=false でも periodic-notes の設定を使う", () => {
      (window as any).app.plugins.getPlugin = vi.fn((id: string) => {
        if (id === "periodic-notes") {
          return {
            settings: {
              quarterly: {
                enabled: false,
                format: "YYYY-[Q]Q",
                folder: "Periodic/Quarterly",
                template: "",
              },
            },
          };
        }
        return null;
      });

      const settings = getQuarterlyNoteSettings(getShell());

      expect(settings.folder).toBe("Periodic/Quarterly");
      expect(settings.format).toBe("YYYY-[Q]Q");
    });
  });

  describe("resolveTopicNotePath", () => {
    it("トピックなしのパスを生成する", () => {
      const date = window.moment("2026-03-04");
      const path = resolveTopicNotePath(date, "day", "", getShell());
      expect(path).toBe("Daily/2026-03-04.md");
    });

    it("トピックありのパスを生成する", () => {
      const date = window.moment("2026-03-04");
      const path = resolveTopicNotePath(date, "day", "novel", getShell());
      expect(path).toBe("Daily/novel-2026-03-04.md");
    });

    it("month は periodic-notes の folder 設定を反映する", () => {
      (window as any).app.plugins.getPlugin = vi.fn((id: string) => {
        if (id === "periodic-notes") {
          return {
            settings: {
              monthly: {
                enabled: false,
                format: "YYYY-MM",
                folder: "Periodic/Monthly",
                template: "",
              },
            },
          };
        }
        return null;
      });

      const date = window.moment("2026-03-04");
      const path = resolveTopicNotePath(date, "month", "", getShell());

      expect(path).toBe("Periodic/Monthly/2026-03.md");
    });

    it("quarter は periodic-notes の folder 設定を反映する", () => {
      (window as any).app.plugins.getPlugin = vi.fn((id: string) => {
        if (id === "periodic-notes") {
          return {
            settings: {
              quarterly: {
                enabled: false,
                format: "YYYY-[Q]Q",
                folder: "Periodic/Quarterly",
                template: "",
              },
            },
          };
        }
        return null;
      });

      const date = window.moment("2026-05-04");
      const path = resolveTopicNotePath(date, "quarter", "", getShell());

      expect(path).toBe("Periodic/Quarterly/2026-Q2.md");
    });
  });

  describe("getAllTopicNotes", () => {
    const mockFile = (basename: string, ext: string = "md") => {
      const f = new TFile();
      f.basename = basename;
      f.extension = ext;
      return f;
    };

    beforeEach(() => {
      const mockFiles = [
        mockFile("2026-03-01"), // デフォルトトピック
        mockFile("novel-2026-03-02"), // novel トピック
        mockFile("prog-2026-03-03"), // prog トピック
        mockFile("invalid-file"), // 無効（日付なし）
        mockFile("2026-03-04", "txt"), // .md でない
      ];

      (Vault as any).recurseChildren.mockImplementation(
        (_folder: any, callback: (f: any) => void) => {
          mockFiles.forEach((f) => callback(f));
        },
      );
    });

    it("デフォルトトピックは他トピックのファイルを拾わない", () => {
      const result = getAllTopicNotes(getShell(), "day", "");
      expect(Object.keys(result)).toHaveLength(1);
      expect(Object.values(result)[0].basename).toBe("2026-03-01");
    });

    it("特定トピックのファイルだけを取得する", () => {
      const result = getAllTopicNotes(getShell(), "day", "novel");
      expect(Object.keys(result)).toHaveLength(1);
      expect(Object.values(result)[0].basename).toBe("novel-2026-03-02");
    });
  });

  describe("getTopicNote", () => {
    it("ノートが存在すれば TFile を返し、なければ null を返す", () => {
      const f = new TFile();
      f.basename = "2026-03-01";
      f.extension = "md";

      (Vault as any).recurseChildren.mockImplementation(
        (_folder: any, callback: (f: any) => void) => callback(f),
      );

      const found = getTopicNote(getShell(), window.moment("2026-03-01"), "day", "");
      expect(found?.basename).toBe("2026-03-01");

      const notFound = getTopicNote(getShell(), window.moment("2099-12-31"), "day", "");
      expect(notFound).toBeNull();
    });
  });
});
