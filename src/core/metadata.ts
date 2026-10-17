import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";

export const DSTR_TAGS_METADATA_KEY = "dstrtags";
export const DSTR_THREAD_ID_METADATA_KEY = "dstrId";

export function getDSTRThreadId(metadata: Record<string, string> | undefined): string | undefined {
  return metadata?.[DSTR_THREAD_ID_METADATA_KEY] ??
    metadata?.[LEGACY_DAYSTREAM_IDENTIFIERS.threadIdMetadataKey];
}

export function getDSTRTagsMetadata(metadata: Record<string, string>): string | undefined {
  return metadata[DSTR_TAGS_METADATA_KEY] ??
    metadata[LEGACY_DAYSTREAM_IDENTIFIERS.tagsMetadataKey];
}

export function normalizeDSTRMetadata(metadata: Record<string, string>): Record<string, string> {
  const next = { ...metadata };
  const threadId = getDSTRThreadId(metadata);
  const tags = getDSTRTagsMetadata(metadata);

  delete next[LEGACY_DAYSTREAM_IDENTIFIERS.threadIdMetadataKey];
  delete next[LEGACY_DAYSTREAM_IDENTIFIERS.tagsMetadataKey];

  if (threadId != null) next[DSTR_THREAD_ID_METADATA_KEY] = threadId;
  if (tags != null) next[DSTR_TAGS_METADATA_KEY] = tags;

  return next;
}
