import { parseDSTRTags, TAG_METADATA_KEY } from "src/core/tags";

// 意図: 投稿のmetadata解釈をUIとDBで共有し、表示条件の食い違いを防ぐ。
export const PINNED_METADATA_KEY = "pinned";

export function getPostTags(metadata: Record<string, string>): string[] {
  return parseDSTRTags(metadata);
}

export function isArchived(metadata: Record<string, string>): boolean {
  return metadata.archived != null && metadata.archived.length > 0;
}

export function isDeleted(metadata: Record<string, string>): boolean {
  return metadata.deleted != null && metadata.deleted.length > 0;
}

export function isPinned(metadata: Record<string, string>): boolean {
  return metadata[PINNED_METADATA_KEY] != null;
}

// 意図: 投稿の表示可否を一か所で判定し、UI と DB の絞り込み条件をそろえる。
export function isVisible(metadata: Record<string, string>): boolean {
  return !isArchived(metadata) && !isDeleted(metadata);
}

export function getRawTagMetadata(metadata: Record<string, string>): string {
  return metadata[TAG_METADATA_KEY] ?? "";
}
