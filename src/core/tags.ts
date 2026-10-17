import { DSTR_TAGS_METADATA_KEY, getDSTRTagsMetadata } from "src/core/metadata";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";

const TAG_METADATA_KEY = DSTR_TAGS_METADATA_KEY;

export function isValidTagName(name: string): boolean {
  const trimmed = name.trim();
  return (
    trimmed.length > 0 &&
    !trimmed.includes(",") &&
    !trimmed.includes("]") &&
    !trimmed.includes("\n") &&
    !trimmed.includes("\r")
  );
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!isValidTagName(trimmed) || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

export function parseDSTRTags(metadata: Record<string, string>): string[] {
  const raw = getDSTRTagsMetadata(metadata);
  if (!raw) {
    return [];
  }

  return normalizeTags(raw.split(","));
}

export function serializeDSTRTags(tags: string[]): string {
  return normalizeTags(tags).join(", ");
}

export function removeLegacyDSTRTags(metadata: Record<string, string>): void {
  delete metadata[LEGACY_DAYSTREAM_IDENTIFIERS.tagsMetadataKey];
}

export { TAG_METADATA_KEY };
