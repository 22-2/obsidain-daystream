import type { Command } from "obsidian";
import { Notice } from "obsidian";
import { getRecentErrorReports, reportError } from "src/core/error-report";
import type { DebugEnvironment } from "src/features/diagnostics/debug-info";
import { buildDebugInfo } from "src/features/diagnostics/debug-info";

export function registerDiagnosticsCommands(
  addCommand: (command: Command) => Command,
  getEnvironment: () => DebugEnvironment,
): void {
  addCommand({
    id: "dstr-copy-debug-info",
    name: "Daystream: 不具合報告用の情報をコピー",
    callback: async () => {
      const text = buildDebugInfo(getEnvironment(), getRecentErrorReports());
      try {
        await navigator.clipboard.writeText(text);
        // 意図: エラー文にはノートのパスや内容が含まれ得るため、共有前の確認を促す。
        new Notice("不具合報告用の情報をコピーしました。共有する前に内容を確認してください");
      } catch (error) {
        reportError({
          context: "Failed to copy debug info",
          error,
          notice: "不具合報告用の情報をコピーできませんでした",
        });
      }
    },
  });
}
