import { STORAGE_KEYS } from "src/features/workspace/config/constants";
import type { DSTRNoteMode } from "src/core/domain/note-mode";
import type { Granularity } from "src/core/domain/granularity";

function getFixedInputStorageKey(file: string | null, fixedSessionNumber: number): string {
  if (!file) return STORAGE_KEYS.INPUT_FIXED;

  // 意図: fixedノートでは session 単位で draft を分離し、会話を切り替えても入力が混ざらないようにする。
  return `${STORAGE_KEYS.INPUT_FIXED}:${encodeURIComponent(file)}:${fixedSessionNumber}`;
}

function getFixedDraftMetadataStorageKey(file: string | null, fixedSessionNumber: number): string {
  if (!file) return STORAGE_KEYS.INPUT_FIXED_DRAFT_METADATA;

  // 意図: 本文だけでなく pin/tag 下書きも session 単位で復元できるように同じ粒度で保存する。
  return `${STORAGE_KEYS.INPUT_FIXED_DRAFT_METADATA}:${encodeURIComponent(file)}:${fixedSessionNumber}`;
}

export function getInputStorageKey(
  noteMode: DSTRNoteMode,
  file: string | null,
  fixedSessionNumber = 1,
): string {
  return noteMode === "fixed"
    ? getFixedInputStorageKey(file, fixedSessionNumber)
    : STORAGE_KEYS.INPUT_PERIODIC;
}

export function getInputAreaSizeStorageKey(
  noteMode: DSTRNoteMode,
  file: string | null,
  granularity: Granularity,
  noteDateStr: string,
): string {
  if (noteMode === "fixed") {
    if (!file) return STORAGE_KEYS.INPUT_AREA_SIZE;
    // 意図: fixed ノートはファイルパス単位で expand 状態を分離し、ノートごとに異なる表示サイズを保持できるようにする。
    return `${STORAGE_KEYS.INPUT_AREA_SIZE}:fixed:${encodeURIComponent(file)}`;
  }
  // 意図: periodic ノートは粒度と日付の組み合わせでファイルが決まるため、その組み合わせをキーにする。
  return `${STORAGE_KEYS.INPUT_AREA_SIZE}:periodic:${granularity}:${noteDateStr}`;
}

export function getDraftMetadataStorageKey(
  noteMode: DSTRNoteMode,
  file: string | null,
  fixedSessionNumber = 1,
): string {
  return noteMode === "fixed"
    ? getFixedDraftMetadataStorageKey(file, fixedSessionNumber)
    : STORAGE_KEYS.INPUT_PERIODIC_DRAFT_METADATA;
}
