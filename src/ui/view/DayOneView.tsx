import type { WorkspaceLeaf } from "obsidian";
import type { ReactNode } from "react";
import type { Settings } from "src/settings";
import { DayOneWorkspaceLayout } from "src/ui/components/layout/DayOneWorkspaceLayout";
import "src/ui/styles/dayone.css";
import { createDayOneViewState, type MFDIInitialNavigationState } from "src/ui/view/state";
import { MFDIView } from "src/ui/view/MFDIView";

export const VIEW_TYPE_DAY_ONE = "dayone-view";

/**
 * Experimental Day One-inspired shell.
 *
 * It deliberately extends MFDIView so state restoration, editor readiness,
 * Obsidian actions, and the view-scoped store remain the same while the
 * visual experiment can evolve independently from the classic dashboard.
 */
export class DayOneView extends MFDIView {
  constructor(leaf: WorkspaceLeaf, settings: Settings) {
    super(leaf, settings);
    // The archive-style shell starts from the complete journal timeline.
    this.setStatePartial(createDayOneViewState());
  }

  getIcon(): string {
    return "book-open";
  }

  getViewType(): string {
    return VIEW_TYPE_DAY_ONE;
  }

  getDisplayText(): string {
    return "Day One-inspired Journal";
  }

  getInitialStoreNavigationState(): MFDIInitialNavigationState {
    const state = createDayOneViewState();
    return {
      displayMode: state.displayMode,
      contentView: "timeline",
      granularity: "day",
      dateFilter: state.dateFilter,
      timeFilter: state.timeFilter,
      asTask: false,
      threadOnly: false,
      activeTag: null,
      threadFocusRootId: null,
    };
  }

  protected getReactLayout(): ReactNode {
    return <DayOneWorkspaceLayout />;
  }

  protected shouldRegisterPanelActions(): boolean {
    // This shell intentionally has no sidebars; leaving the classic actions
    // out keeps the Obsidian header aligned with the visible UI.
    return false;
  }
}
