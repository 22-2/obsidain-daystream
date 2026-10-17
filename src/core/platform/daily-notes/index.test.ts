import { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { describe, expect, it, vi } from "vitest";
import { getDateFromFilename, resolveTopicNotePath } from "src/core/platform/daily-notes";

function getShell() {
  const app = {
    vault: {},
    plugins: { getPlugin: vi.fn(() => null) },
    internalPlugins: {
      getPluginById: vi.fn(() => ({
        instance: { options: { format: "YYYY-MM-DD", folder: "Daily", template: "" } },
      })),
    },
  };
  return new ObsidianAppShell(app as never);
}

describe("トピック付きノート", () => {
  it("トピックなしではファイル名に接頭辞を付けない", () => {
    const path = resolveTopicNotePath(window.moment("2026-03-04"), "day", "", getShell());
    expect(path).toBe("Daily/2026-03-04.md");
  });

  it("トピックIDを `<topicId>-` の接頭辞としてファイル名に付ける", () => {
    const path = resolveTopicNotePath(window.moment("2026-03-04"), "day", "novel", getShell());
    expect(path).toBe("Daily/novel-2026-03-04.md");
  });

  it("トピック付きのファイル名から日付を取り出す", () => {
    const date = getDateFromFilename("novel-2026-03-04", "day", getShell(), "novel");
    expect(date?.format("YYYY-MM-DD")).toBe("2026-03-04");
    expect(getDateFromFilename("prog-2026-03-04", "day", getShell(), "novel")).toBeNull();
  });
});
