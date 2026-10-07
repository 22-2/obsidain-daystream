import { GRANULARITY_CONFIG } from "src/features/workspace/config/granularity-config";
import type { Granularity } from "src/core/domain/granularity";
import type { MomentLike } from "src/core/domain/post";
import type { DisplayMode } from "src/features/workspace/types";
import { isTimelineView } from "src/features/workspace/utils/view-mode";

export function isPastDateReadOnly(params: {
  date: MomentLike;
  granularity: Granularity;
  allowEditingPastNotes: boolean;
}) {
  const { date, granularity, allowEditingPastNotes } = params;
  if (allowEditingPastNotes) return false;
  return date.isBefore(window.moment(), GRANULARITY_CONFIG[granularity].unit);
}

export function isViewReadOnly(params: {
  date: MomentLike;
  granularity: Granularity;
  displayMode: DisplayMode;
  allowEditingPastNotes: boolean;
  noteMode?: "periodic" | "fixed";
}) {
  const { date, granularity, displayMode, allowEditingPastNotes, noteMode = "periodic" } = params;
  if (noteMode === "fixed") return false;
  if (isTimelineView(displayMode)) return false;
  return isPastDateReadOnly({ date, granularity, allowEditingPastNotes });
}
