import { obsidianMoment } from "src/core/platform/obsidian-globals";
import { DATE_FORMAT, DATE_TIME_FORMAT, TIME_FORMAT } from "src/core/domain/date-formats";
import type { Granularity } from "src/core/domain/granularity";
import type { MomentLike } from "src/core/domain/post";

function isFencedCodeBlockStart(line: string): boolean {
  return /^[ \t]*(```|~~~)/.test(line);
}

export function toText(
  input: string,
  granularity: Granularity,
  timestamp?: MomentLike,
  metadata: Record<string, string> = {},
): string {
  if (input.trim().length === 0) {
    return "";
  }

  const now = timestamp ?? obsidianMoment();
  const timeStr = granularity === "day" ? now.format(TIME_FORMAT) : now.format(DATE_TIME_FORMAT);

  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const lines = normalized.split("\n");
  const firstLine = lines[0];
  const shouldMoveFirstLineToBody = isFencedCodeBlockStart(firstLine);
  const inlineFirstLine = shouldMoveFirstLineToBody ? "" : firstLine;
  const restLines = shouldMoveFirstLineToBody ? lines : lines.slice(1);
  const metadataEntries = Object.entries(metadata).filter(([k]) => k !== "blockId");
  const blockId = metadata.blockId;

  const head = inlineFirstLine.length > 0 ? `- ${timeStr} ${inlineFirstLine}` : `- ${timeStr}`;

  const bodyLines = restLines
    .map((x) => (x.length === 0 ? "" : `    ${x}`))
    .filter((x, index, array) => {
      if (x.length > 0) {
        return true;
      }
      return index < array.length - 1;
    });

  const metadataLines = metadataEntries.map(([k, v]) => `    [${k}::${v}]`);

  const trailingLines = [...bodyLines, ...metadataLines];
  if (blockId) {
    trailingLines.push(`    ^${blockId}`);
  }

  if (trailingLines.length === 0) {
    return head + "\n";
  }

  return `${head}\n${trailingLines.join("\n")}\n`;
}

export function resolveTimestamp(
  time: string,
  date: MomentLike,
  metadata?: Record<string, string>,
): MomentLike {
  // Priority: posted metadata (ISO string) > combined datetime
  if (metadata?.posted) {
    const m = obsidianMoment(metadata.posted);
    if (m.isValid()) return m;
  }

  const hasDate = time.includes("-");
  return hasDate
    ? obsidianMoment(time, DATE_TIME_FORMAT)
    : obsidianMoment(`${date.format(DATE_FORMAT)} ${time}`, DATE_TIME_FORMAT);
}
/** 4行以上の連続改行を3行に詰め、投稿の削除で空行がたまらないようにする。 */
export function collapseExcessBlankLines(content: string): string {
  return content.replace(/\n{4,}/g, "\n\n\n");
}
function trimLeadingLineBreaks(text: string): string {
  return text.replace(/^(?:\r\n|\r|\n)+/, "");
}
export function joinWithSingleBoundaryNewline(content: string, text: string): string {
  const normalizedText = trimLeadingLineBreaks(text);

  if (normalizedText.length === 0) {
    return content;
  }

  if (content.length === 0 || content.endsWith("\n")) {
    return content + normalizedText;
  }

  return `${content}\n${normalizedText}`;
}
export function skipImmediateLineBreak(content: string, index: number): number {
  if (content.slice(index, index + 2) === "\r\n") {
    return index + 2;
  }

  if (content[index] === "\n" || content[index] === "\r") {
    return index + 1;
  }

  return index;
}
