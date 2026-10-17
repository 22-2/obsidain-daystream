import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";

export const DSTR_TAGS_METADATA_KEY = "dstrtags";
export const DSTR_THREAD_ID_METADATA_KEY = "dstrId";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

/** Persisted metadata is runtime data; accept it only after verifying every value is a string. */
export function parseDSTRMetadataJson(value: string): Record<string, string> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isStringRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getDSTRThreadId(metadata: Record<string, unknown> | undefined): string | undefined {
  const current = metadata?.[DSTR_THREAD_ID_METADATA_KEY];
  if (typeof current === "string") return current;

  const legacy = metadata?.[LEGACY_DAYSTREAM_IDENTIFIERS.threadIdMetadataKey];
  return typeof legacy === "string" ? legacy : undefined;
}

export function getDSTRTagsMetadata(metadata: Record<string, unknown>): string | undefined {
  const current = metadata[DSTR_TAGS_METADATA_KEY];
  if (typeof current === "string") return current;

  const legacy = metadata[LEGACY_DAYSTREAM_IDENTIFIERS.tagsMetadataKey];
  return typeof legacy === "string" ? legacy : undefined;
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
