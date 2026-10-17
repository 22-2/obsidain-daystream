import type { ErrorReport } from "src/core/error-report";

export interface DebugEnvironment {
  pluginVersion: string;
  obsidianApiVersion: string;
  platform: string;
  debugMode: boolean;
}

function formatErrorReport(report: ErrorReport, index: number): string {
  const lines = [`### ${index + 1}. ${report.context}`, `- 発生: ${report.at}`, `- 内容: ${report.message}`];
  if (report.details) lines.push(`- 詳細: \`${JSON.stringify(report.details)}\``);
  if (report.stack) lines.push("", "```", report.stack, "```");
  return lines.join("\n");
}

/** 不具合報告にそのまま貼れる Markdown を組み立てる。新しいエラーを先に並べる。 */
export function buildDebugInfo(env: DebugEnvironment, reports: readonly ErrorReport[]): string {
  const header = [
    "## Daystream 不具合報告用の情報",
    `- Daystream: ${env.pluginVersion}`,
    `- Obsidian API: ${env.obsidianApiVersion}`,
    `- 環境: ${env.platform}`,
    `- デバッグモード: ${env.debugMode ? "ON" : "OFF"}`,
    "",
    "## 直近のエラー",
  ].join("\n");

  if (reports.length === 0) return `${header}\n\n記録されたエラーはありません。\n`;

  const body = [...reports].reverse().map(formatErrorReport).join("\n\n");
  return `${header}\n\n${body}\n`;
}
