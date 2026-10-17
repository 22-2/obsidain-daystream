import type { ErrorReport } from "src/core/error-report";
import { buildDebugInfo } from "src/features/diagnostics/debug-info";
import { describe, expect, it } from "vitest";

const env = {
  pluginVersion: "2.0.3",
  obsidianApiVersion: "1.13.0",
  platform: "Windows (desktop)",
  debugMode: false,
};

function report(context: string, overrides: Partial<ErrorReport> = {}): ErrorReport {
  return { at: "2026-03-02T07:00:00.000Z", context, message: `${context} message`, ...overrides };
}

describe("buildDebugInfo", () => {
  it("環境情報を含め、エラーが無いことを明示する", () => {
    const text = buildDebugInfo(env, []);

    expect(text).toContain("- Daystream: 2.0.3");
    expect(text).toContain("- Obsidian API: 1.13.0");
    expect(text).toContain("- 環境: Windows (desktop)");
    expect(text).toContain("- デバッグモード: OFF");
    expect(text).toContain("記録されたエラーはありません。");
  });

  it("新しいエラーから順に、詳細とスタックを並べる", () => {
    const text = buildDebugInfo(env, [
      report("older"),
      report("newer", { details: { path: "a.md" }, stack: "Error: newer\n    at x" }),
    ]);

    expect(text.indexOf("### 1. newer")).toBeGreaterThan(-1);
    expect(text.indexOf("### 1. newer")).toBeLessThan(text.indexOf("### 2. older"));
    expect(text).toContain('- 詳細: `{"path":"a.md"}`');
    expect(text).toContain("```\nError: newer\n    at x\n```");
  });
});
