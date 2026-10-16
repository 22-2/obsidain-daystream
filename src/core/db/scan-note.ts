import { resolveMemoTimestamp } from "src/core/post-utils";
import { parseThinoEntries } from "src/core/thino";
import type { MemoRecord } from "src/core/db/daystream-db";
import type { ScannableNote } from "src/core/db/worker-api";
import { getPostTags, isArchived, isDeleted, isPinned } from "src/core/domain/post-metadata";

export function buildMemoRecordsForNote(file: ScannableNote): MemoRecord[] {
  return parseThinoEntries(file.content).map((entry) => {
    const createdAt = resolveMemoTimestamp(file.noteDate, entry.time, entry.metadata);

    return {
      id: `${file.path}:${entry.startOffset}`,
      path: file.path,
      noteName: file.noteName,
      topicId: file.topicId,
      noteGranularity: file.noteGranularity,
      content: entry.message,
      tags: getPostTags(entry.metadata),
      metadataJson: JSON.stringify(entry.metadata),
      startOffset: entry.startOffset,
      endOffset: entry.endOffset,
      bodyStartOffset: entry.bodyStartOffset,
      createdAt,
      updatedAt: createdAt,
      noteDate: file.noteDate,
      archived: isArchived(entry.metadata) ? 1 : 0,
      deleted: isDeleted(entry.metadata) ? 1 : 0,
      pinned: isPinned(entry.metadata) ? 1 : 0,
    };
  });
}
