import type { MomentLike } from "src/core/domain/post";

export function formatTaskText(input: string, time?: string): string {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const t =
    time ?? (typeof window !== "undefined" ? window.moment().format("HH:mm:ss") : "23:59:59");

  if (normalized.length === 0) {
    return `- [ ] ${t}`;
  }

  const lines = normalized.split("\n");
  const firstLine = lines[0];
  const restLines = lines.slice(1);

  const head = `- [ ] ${t} ${firstLine}`;
  if (restLines.length === 0) {
    return head;
  }

  const body = restLines.map((x) => (x.length === 0 ? "" : `    ${x}`)).join("\n");

  return `${head}\n${body}`;
}
export interface Task {
  mark: " " | string;
  name: string;
  offset: number;
  path: string;
  timestamp: MomentLike;
}
