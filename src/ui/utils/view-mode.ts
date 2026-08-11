import { DISPLAY_MODE } from "src/ui/config/consntants";
import type { DisplayMode } from "src/ui/types";

interface ViewState {
  displayMode: DisplayMode;
  threadFocusRootId: string | null;
}

export function isTimelineView(displayMode: DisplayMode): boolean {
  return displayMode === DISPLAY_MODE.TIMELINE;
}

export function isThreadView({ displayMode, threadFocusRootId }: ViewState): boolean {
  return !isTimelineView(displayMode) && threadFocusRootId !== null;
}

export function isPlainFocusView(viewState: ViewState): boolean {
  return !isTimelineView(viewState.displayMode) && viewState.threadFocusRootId === null;
}
