import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import type { DisplayMode, Granularity, MomentLike } from "src/ui/types";
import { isTimelineView } from "src/ui/utils/view-mode";

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
