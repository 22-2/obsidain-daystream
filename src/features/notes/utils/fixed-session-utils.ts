import { parseFixedSessionSections } from "src/core/fixed-sessions";
import { resolveTimestamp } from "src/core/post-utils";
import type { MomentLike, Post } from "src/core/domain/post";
import type { FixedSessionMetaMap } from "src/features/notes/utils/fixed-session-storage";
import { buildPostFromEntry, resolvePostId, resolveThreadRootId } from "src/features/posts/utils/thread-utils";

export interface FixedSessionSummary {
  sessionNumber: number;
  title: string;
  postCount: number;
  createdAt: string | null;
  lastActiveAt: string | null;
  pinned: boolean;
}

function sortSessions(sessions: FixedSessionSummary[]): FixedSessionSummary[] {
  return [...sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    // 意図: セッション並びは編集時刻の揺れに影響されないよう、作成時刻を唯一の基準に固定する。
    const aTime = a.createdAt ? window.moment(a.createdAt).valueOf() : 0;
    const bTime = b.createdAt ? window.moment(b.createdAt).valueOf() : 0;
    if (aTime !== bTime) return bTime - aTime;

    return a.sessionNumber - b.sessionNumber;
  });
}

export function groupSessionsByActivity(sessions: FixedSessionSummary[]): {
  pinned: FixedSessionSummary[];
  last7Days: FixedSessionSummary[];
  older: FixedSessionSummary[];
} {
  const threshold = window.moment().subtract(7, "days");
  const sorted = sortSessions(sessions);
  const pinned = sorted.filter((session) => session.pinned);
  const unpinned = sorted.filter((session) => !session.pinned);

  const isRecent = (session: FixedSessionSummary): boolean => {
    if (!session.lastActiveAt) return false;
    const t = window.moment(session.lastActiveAt);
    return t.isValid() && t.isSameOrAfter(threshold);
  };

  return {
    pinned,
    last7Days: unpinned.filter(isRecent),
    older: unpinned.filter((session) => !isRecent(session)),
  };
}

export function isThreadRootMetadata(metadata: Record<string, string>): boolean {
  const threadId = metadata.mfdiId;
  const parentId = metadata.parentId;
  return !!threadId && !parentId;
}

function resolveSessionActivityIso(
  entries: Array<{ time: string; metadata: Record<string, string> }>,
): string | null {
  let latestTimestamp: number | null = null;
  let latestIso: string | null = null;

  for (const entry of entries) {
    const posted = entry.metadata.posted?.trim();
    if (posted) {
      const postedTime = window.moment(posted);
      if (
        postedTime.isValid() &&
        (latestTimestamp == null || postedTime.valueOf() > latestTimestamp)
      ) {
        latestTimestamp = postedTime.valueOf();
        latestIso = postedTime.toISOString();
      }
      continue;
    }

    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(entry.time)) {
      const fullTimestamp = window.moment(entry.time, "YYYY-MM-DD HH:mm:ss", true);
      if (
        fullTimestamp.isValid() &&
        (latestTimestamp == null || fullTimestamp.valueOf() > latestTimestamp)
      ) {
        latestTimestamp = fullTimestamp.valueOf();
        latestIso = fullTimestamp.toISOString();
      }
    }
  }

  return latestIso;
}

function resolveSessionCreatedAtIso(
  entries: Array<{ time: string; metadata: Record<string, string> }>,
): string | null {
  let earliestTimestamp: number | null = null;
  let earliestIso: string | null = null;

  for (const entry of entries) {
    const posted = entry.metadata.posted?.trim();
    if (posted) {
      const postedTime = window.moment(posted);
      if (
        postedTime.isValid() &&
        (earliestTimestamp == null || postedTime.valueOf() < earliestTimestamp)
      ) {
        earliestTimestamp = postedTime.valueOf();
        earliestIso = postedTime.toISOString();
      }
      continue;
    }

    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(entry.time)) {
      const fullTimestamp = window.moment(entry.time, "YYYY-MM-DD HH:mm:ss", true);
      if (
        fullTimestamp.isValid() &&
        (earliestTimestamp == null || fullTimestamp.valueOf() < earliestTimestamp)
      ) {
        earliestTimestamp = fullTimestamp.valueOf();
        earliestIso = fullTimestamp.toISOString();
      }
    }
  }

  return earliestIso;
}

export function buildFixedSessionSummaries(params: {
  content: string;
  insertAfter: string;
  metaMap: FixedSessionMetaMap;
}): FixedSessionSummary[] {
  const { content, insertAfter, metaMap } = params;
  const sections = parseFixedSessionSections(content, insertAfter);
  const sectionByNumber = new Map(sections.map((section) => [section.sessionNumber, section]));
  const sessionNumbers = new Set<number>([1]);

  sections.forEach((section) => {
    sessionNumbers.add(section.sessionNumber);
  });

  Object.keys(metaMap).forEach((rawSessionNumber) => {
    const sessionNumber = Number.parseInt(rawSessionNumber, 10);
    if (Number.isFinite(sessionNumber)) {
      sessionNumbers.add(sessionNumber);
    }
  });

  return [...sessionNumbers]
    .sort((left, right) => left - right)
    .map((sessionNumber) => {
      const section = sectionByNumber.get(sessionNumber);
      const meta = metaMap[String(sessionNumber)] ?? {};
      const createdAt =
        meta.createdAt ??
        resolveSessionCreatedAtIso(section?.entries ?? []) ??
        (sessionNumber === 1 ? window.moment().toISOString() : null);
      const lastActiveAt =
        resolveSessionActivityIso(section?.entries ?? []) ??
        createdAt ??
        (sessionNumber === 1 ? window.moment().toISOString() : null);

      return {
        sessionNumber,
        title: meta.name?.trim() || `Session ${sessionNumber}`,
        postCount: section?.entries.length ?? 0,
        createdAt,
        lastActiveAt,
        pinned: meta.pinned === true,
      };
    });
}

export function buildFixedSessionPosts(params: {
  content: string;
  insertAfter: string;
  path: string;
  sessionNumber?: number;
  searchQuery?: string;
  threadOnly?: boolean;
  referenceDate: MomentLike;
}): Post[] {
  const {
    content,
    insertAfter,
    path,
    sessionNumber,
    searchQuery = "",
    threadOnly = false,
    referenceDate,
  } = params;
  const query = searchQuery.trim().toLowerCase();

  return parseFixedSessionSections(content, insertAfter)
    .filter((section) => sessionNumber == null || section.sessionNumber === sessionNumber)
    .flatMap((section) => {
      return section.entries
        .filter((entry) => {
          if (query && !entry.message.toLowerCase().includes(query)) {
            return false;
          }
          if (threadOnly && !isThreadRootMetadata(entry.metadata)) {
            return false;
          }
          return true;
        })
        .map((entry) => {
          const timestamp = resolveTimestamp(entry.time, referenceDate, entry.metadata);
          return buildPostFromEntry({
            ...entry,
            path,
            noteDate: timestamp.clone().startOf("day"),
            resolveTimestamp,
          });
        });
    });
}

export function resolveFixedSessionForPost(params: {
  content: string;
  insertAfter: string;
  path: string;
  postId: string;
}): number | null {
  const { content, insertAfter, path, postId } = params;
  const sections = parseFixedSessionSections(content, insertAfter);

  for (const section of sections) {
    const found = section.entries.find((entry) => {
      const resolvedId = resolvePostId(entry.metadata, path, entry.startOffset);
      const threadRootId = resolveThreadRootId(entry.metadata);
      return resolvedId === postId || threadRootId === postId;
    });

    if (found) {
      return section.sessionNumber;
    }
  }

  return null;
}
