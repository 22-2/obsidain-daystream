import type { Granularity } from "src/core/domain/granularity";
import type { DateFilter, DisplayMode, TimeFilter } from "src/features/workspace/types";

export interface DSTRActionDelegate {
  onOpenDailyNoteAction?: () => void;
  onOpenComposer?: () => void;
  onChangeGranularity?: (g: Granularity) => void;
  onChangeThreadOnly?: (threadOnly: boolean) => void;
  onChangeTimeFilter?: (f: TimeFilter) => void;
  onChangeDateFilter?: (f: DateFilter) => void;
  onSearchQueryChange?: (query: string) => void;
  onChangeDisplayMode?: (mode: DisplayMode) => void;
  onEditorExpand?: () => void;
  onSubmit?: () => Promise<void>;
  onChangeTopic?: (topicId: string) => void;
  onTopicSaveRequested?: (topicId: string) => Promise<void>;
  onOpenTopicManager?: () => void;
  onToggleSidebar?: () => void;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  onClickHome?: () => void;
  onCopyAllPosts?: () => void;
  onOpenDraftList?: () => void;
  onSearchInputOpen?: () => void;
  onSearchInputClose?: () => void;
  onFixedNoteRenamed?: (oldPath: string, newPath: string) => void;
}

interface DSTRDebugDelegates {
  onGetInputSnapshot?: () => string;
  onSetLiveEditorContentForTesting?: (content: string) => void;
  onGetLiveEditorContentForTesting?: () => string;
  onGetDebugStateForTesting?: () => {
    settingsDateIso: string;
    displayMode: DisplayMode;
    activeTopic: string;
    inputSnapshot: string;
    editingPostMessage: string | null;
    persistedInput: string;
    editorSnapshot: string | null;
  };
}

export type DSTRViewDelegates = DSTRActionDelegate & DSTRDebugDelegates;
