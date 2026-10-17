import { parseThinoEntries, type ThinoEntry } from "src/core/thino";

export interface FixedSessionSection {
  sessionNumber: number;
  headingLine: string;
  headingStartOffset: number;
  headingEndOffset: number;
  sectionEndOffset: number;
  entries: ThinoEntry[];
  isLegacyHeading: boolean;
}

function normalizeSessionHeading(line: string): string {
  return line.trim().replace(/\s+/g, " ");
}

function getSessionHeadingMatch(
  line: string,
  insertAfter: string,
): {
  sessionNumber: number;
  isLegacyHeading: boolean;
} | null {
  const normalizedLine = normalizeSessionHeading(line);
  const normalizedInsertAfter = normalizeSessionHeading(insertAfter);
  const lowerLine = normalizedLine.toLowerCase();
  const lowerInsertAfter = normalizedInsertAfter.toLowerCase();

  if (!lowerInsertAfter) {
    return null;
  }

  if (lowerLine === lowerInsertAfter) {
    return {
      sessionNumber: 1,
      isLegacyHeading: true,
    };
  }

  const prefix = `${lowerInsertAfter} session `;
  if (!lowerLine.startsWith(prefix)) {
    return null;
  }

  const rawSessionNumber = normalizedLine.slice(prefix.length).trim();
  if (!/^\d+$/.test(rawSessionNumber)) {
    return null;
  }

  return {
    sessionNumber: Number.parseInt(rawSessionNumber, 10),
    isLegacyHeading: false,
  };
}

function buildFixedSessionHeading(insertAfter: string, sessionNumber: number): string {
  return `${normalizeSessionHeading(insertAfter)} session ${sessionNumber}`;
}

function appendFixedSessionHeading(content: string, headingLine: string): string {
  const trimmedContent = content.trimEnd();
  if (!trimmedContent) {
    return `${headingLine}\n`;
  }

  return `${trimmedContent}\n\n${headingLine}\n`;
}

export function parseFixedSessionSections(
  content: string,
  insertAfter: string,
): FixedSessionSection[] {
  const lines = content.split("\n");
  const discoveredSections: Array<Omit<FixedSessionSection, "entries" | "sectionEndOffset">> = [];

  let offset = 0;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    const headingMatch = getSessionHeadingMatch(line, insertAfter);

    if (headingMatch) {
      discoveredSections.push({
        sessionNumber: headingMatch.sessionNumber,
        headingLine: line.trim(),
        headingStartOffset: offset,
        headingEndOffset: offset + rawLine.length,
        isLegacyHeading: headingMatch.isLegacyHeading,
      });
    }

    offset += rawLine.length + 1;
  }

  return discoveredSections.map((section, index) => {
    const nextSection = discoveredSections[index + 1];
    const sectionEndOffset = nextSection?.headingStartOffset ?? content.length;
    const sectionContent = content.slice(section.headingStartOffset, sectionEndOffset);
    const entries = parseThinoEntries(sectionContent, {
      headingMatcher: (line) => {
        return (
          normalizeSessionHeading(line).toLowerCase() ===
          normalizeSessionHeading(section.headingLine).toLowerCase()
        );
      },
      offsetBase: section.headingStartOffset,
    });

    return {
      ...section,
      sectionEndOffset,
      entries,
    };
  });
}

export function ensureFixedSessionHeading(params: {
  content: string;
  insertAfter: string;
  sessionNumber: number;
}): {
  nextContent: string;
  headingLine: string;
} {
  const { content, insertAfter, sessionNumber } = params;
  const explicitSessionOneHeading = buildFixedSessionHeading(insertAfter, 1);
  const requestedHeading = buildFixedSessionHeading(insertAfter, sessionNumber);
  const sections = parseFixedSessionSections(content, insertAfter);
  const requestedSection = sections.find((section) => section.sessionNumber === sessionNumber);

  if (requestedSection) {
    if (requestedSection.isLegacyHeading && sessionNumber === 1) {
      return {
        nextContent:
          content.slice(0, requestedSection.headingStartOffset) +
          explicitSessionOneHeading +
          content.slice(requestedSection.headingEndOffset),
        headingLine: explicitSessionOneHeading,
      };
    }

    return {
      nextContent: content,
      headingLine: requestedSection.headingLine,
    };
  }

  const legacySessionOne = sections.find(
    (section) => section.sessionNumber === 1 && section.isLegacyHeading,
  );
  const normalizedContent = legacySessionOne
    ? content.slice(0, legacySessionOne.headingStartOffset) +
      explicitSessionOneHeading +
      content.slice(legacySessionOne.headingEndOffset)
    : content;

  const normalizedSections = legacySessionOne
    ? parseFixedSessionSections(normalizedContent, insertAfter)
    : sections;
  const hasSessionOne = normalizedSections.some((section) => section.sessionNumber === 1);

  let nextContent = normalizedContent;
  if (!hasSessionOne) {
    nextContent = appendFixedSessionHeading(nextContent, explicitSessionOneHeading);
  }

  if (sessionNumber === 1) {
    return {
      nextContent,
      headingLine: explicitSessionOneHeading,
    };
  }

  return {
    nextContent: appendFixedSessionHeading(nextContent, requestedHeading),
    headingLine: requestedHeading,
  };
}

export function removeFixedSessionSection(params: {
  content: string;
  insertAfter: string;
  sessionNumber: number;
}): {
  nextContent: string;
  removed: FixedSessionSection | null;
} {
  const { content, insertAfter, sessionNumber } = params;
  const sections = parseFixedSessionSections(content, insertAfter);
  const targetSection = sections.find((section) => section.sessionNumber === sessionNumber);

  if (!targetSection) {
    return {
      nextContent: content,
      removed: null,
    };
  }

  const nextContent =
    `${content.slice(0, targetSection.headingStartOffset)}${content.slice(targetSection.sectionEndOffset)}`
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd();

  return {
    // 意図: section 削除後に過剰な空行だけ正規化し、他セクションの相対オフセットを壊さない最小編集に留める。
    nextContent: nextContent.length > 0 ? `${nextContent}\n` : "",
    removed: targetSection,
  };
}
