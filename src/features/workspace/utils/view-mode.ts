import { DISPLAY_MODE } from "src/features/workspace/config/constants";
import type { DisplayMode } from "src/features/workspace/types";

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
