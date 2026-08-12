import { useCallback, useEffect } from "react";
import { useAppContext } from "src/ui/context/AppContext";
import { useEditorRefs } from "src/ui/context/EditorRefsContext";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { usePostActions } from "src/ui/hooks/internal/usePostActions";
import { INPUT_AREA_SIZE } from "src/ui/config/consntants";
import { useRequiredAppStore } from "src/ui/store/appStore";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { getInputStorageKey } from "src/ui/store/slices/inputStorage";
import type { DisplayMode, Granularity } from "src/ui/types";
import type { MFDIView } from "src/ui/view/MFDIView";
import { useShallow } from "zustand/shallow";

/** Installs the callbacks exposed to Obsidian chrome and non-React callers. */
export function useMFDIViewDelegates(view: MFDIView | null): void {
  const { shell, settings } = useAppContext();
  const { openDraftList } = useObsidianUi();
  const store = useRequiredAppStore();
  const { inputRef } = useEditorRefs();

  const {
    isReadOnly,
    inputAreaSize,
    setGranularity,
    setTimeFilter,
    setDateFilter,
    setActiveTopic,
    setAsTask,
    setThreadOnly,
    setDisplayMode,
    setSearchQuery,
    setInputAreaSize,
    toggleSidebar,
    toggleLeftPanel,
    toggleRightPanel,
  } = useSettingsStore(
    useShallow((state) => ({
      isReadOnly: state.isReadOnly(),
      inputAreaSize: state.inputAreaSize,
      setGranularity: state.setGranularity,
      setTimeFilter: state.setTimeFilter,
      setDateFilter: state.setDateFilter,
      setActiveTopic: state.setActiveTopic,
      setAsTask: state.setAsTask,
      setThreadOnly: state.setThreadOnly,
      setDisplayMode: state.setDisplayMode,
      setSearchQuery: state.setSearchQuery,
      setInputAreaSize: state.setInputAreaSize,
      toggleSidebar: state.toggleSidebar,
      toggleLeftPanel: state.toggleLeftPanel,
      toggleRightPanel: state.toggleRightPanel,
    })),
  );

  const { getInputValue, replaceInput } = useEditorStore(
    useShallow((state) => ({
      getInputValue: state.getInputValue,
      replaceInput: state.replaceInput,
    })),
  );

  const { handleSubmit } = usePostActions();
  const handleClickOpenDailyNote = useCallback(() => {
    return store.getState().handleClickOpenDailyNote(shell, settings);
  }, [store, shell, settings]);

  const { setCurrentDailyNote, setTasks } = store.getState();

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onSubmit = handleSubmit;
    return () => {
      view.actionDelegates.onSubmit = undefined;
    };
  }, [view, handleSubmit]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onOpenComposer = () => {
      if (isReadOnly) return;
      store.getState().openComposer();
    };
    return () => {
      view.actionDelegates.onOpenComposer = undefined;
    };
  }, [view, isReadOnly, store]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onOpenDailyNoteAction = handleClickOpenDailyNote;
    return () => {
      view.actionDelegates.onOpenDailyNoteAction = undefined;
    };
  }, [view, handleClickOpenDailyNote]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeGranularity = (nextGranularity: Granularity) => {
      setGranularity(nextGranularity);
      if (nextGranularity !== "day") {
        setTimeFilter("all");
        setDateFilter("today");
      }
      setCurrentDailyNote(null);
      setTasks([]);
    };
    return () => {
      view.actionDelegates.onChangeGranularity = undefined;
    };
  }, [view, setGranularity, setTimeFilter, setDateFilter, setCurrentDailyNote, setTasks]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeTopic = setActiveTopic;
    return () => {
      view.actionDelegates.onChangeTopic = undefined;
    };
  }, [view, setActiveTopic]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeAsTask = setAsTask;
    return () => {
      view.actionDelegates.onChangeAsTask = undefined;
    };
  }, [view, setAsTask]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeThreadOnly = setThreadOnly;
    return () => {
      view.actionDelegates.onChangeThreadOnly = undefined;
    };
  }, [view, setThreadOnly]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeTimeFilter = setTimeFilter;
    return () => {
      view.actionDelegates.onChangeTimeFilter = undefined;
    };
  }, [view, setTimeFilter]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeDateFilter = setDateFilter;
    return () => {
      view.actionDelegates.onChangeDateFilter = undefined;
    };
  }, [view, setDateFilter]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onChangeDisplayMode = (nextDisplayMode: DisplayMode) => {
      setDisplayMode(nextDisplayMode);
    };
    return () => {
      view.actionDelegates.onChangeDisplayMode = undefined;
    };
  }, [view, setDisplayMode]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onSearchQueryChange = setSearchQuery;
    return () => {
      view.actionDelegates.onSearchQueryChange = undefined;
    };
  }, [view, setSearchQuery]);

  useEffect(() => {
    if (!view) return;
    if (isReadOnly) {
      view.actionDelegates.onEditorExpand = undefined;
      return;
    }

    view.actionDelegates.onEditorExpand = () => {
      setInputAreaSize(
        inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED
          ? INPUT_AREA_SIZE.DEFAULT
          : INPUT_AREA_SIZE.MAXIMIZED,
      );
    };
    return () => {
      view.actionDelegates.onEditorExpand = undefined;
    };
  }, [view, isReadOnly, inputAreaSize, setInputAreaSize]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onToggleSidebar = toggleSidebar;
    view.actionDelegates.onToggleLeftPanel = toggleLeftPanel;
    view.actionDelegates.onToggleRightPanel = toggleRightPanel;
    return () => {
      view.actionDelegates.onToggleSidebar = undefined;
      view.actionDelegates.onToggleLeftPanel = undefined;
      view.actionDelegates.onToggleRightPanel = undefined;
    };
  }, [view, toggleSidebar, toggleLeftPanel, toggleRightPanel]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onOpenDraftList = openDraftList;
    return () => {
      view.actionDelegates.onOpenDraftList = undefined;
    };
  }, [view, openDraftList]);

  useEffect(() => {
    if (!view) return;
    // テスト用: 外部から内容を設定するため replaceInput を使う
    // （syncInputSession はエディタ→ストア片方向専用）
    view.actionDelegates.onSetLiveEditorContentForTesting = (content: string) => {
      replaceInput(content);
    };
    view.actionDelegates.onGetLiveEditorContentForTesting = () => getInputValue();

    return () => {
      view.actionDelegates.onSetLiveEditorContentForTesting = undefined;
      view.actionDelegates.onGetLiveEditorContentForTesting = undefined;
    };
  }, [view, replaceInput, getInputValue]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onGetInputSnapshot = () => store.getState().getInputValue();

    return () => {
      view.actionDelegates.onGetInputSnapshot = undefined;
    };
  }, [view, store]);

  useEffect(() => {
    if (!view) return;
    view.actionDelegates.onGetDebugStateForTesting = () => {
      const appState = store.getState();
      return {
        settingsDateIso: appState.date.toISOString(),
        displayMode: appState.displayMode,
        activeTopic: appState.activeTopic,
        inputSnapshot: appState.inputSnapshot,
        editingPostMessage: appState.editingPost?.message ?? null,
        persistedInput:
          appState.storage?.get<string>(
            getInputStorageKey(appState.viewNoteMode, appState.file, appState.fixedSessionNumber),
            "",
          ) ?? "",
        editorSnapshot: inputRef.current?.getContentSnapshot() ?? null,
      };
    };

    return () => {
      view.actionDelegates.onGetDebugStateForTesting = undefined;
    };
  }, [view, store, inputRef]);
}
