import { memo, useCallback, useMemo, type ChangeEvent, type FC } from "react";
import { IconButton } from "src/core/ui/components/common/IconButton";
import { NavButton } from "src/core/ui/components/common/NavButton";
import { DisplayModeIndicator } from "src/features/composer/components/inputarea/DisplayModeIndicator";
import {
  isEditorAlreadyInSeparateWindow,
  showEditorContextMenu,
} from "src/features/composer/components/inputarea/editorContextMenu";
import { Box, Flex, HStack, Input } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";
import { DISPLAY_MODE, INPUT_AREA_SIZE } from "src/features/workspace/config/constants";
import { GRANULARITY_CONFIG } from "src/features/workspace/config/granularity-config";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useObsidianComponent } from "src/core/ui/context/ComponentContext";
import { useAppStore, useRequiredAppStore } from "src/features/workspace/store/appStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { InputAreaSize } from "src/features/workspace/types";
import { isHomeViewState } from "src/features/workspace/utils/view-state";
import { getDaystreamViewCapabilities } from "src/features/workspace/views/state";
import type { ComposerHostView } from "src/features/composer/types/composer-host";
import { useShallow } from "zustand/shallow";

export const InputAreaControl: FC<{
  isReadOnly: boolean;
  inputAreaSize: InputAreaSize;
  onMaximizeToMaxHeight: () => void;
  onMinimize: () => void;
}> = memo(({ isReadOnly, inputAreaSize, onMaximizeToMaxHeight, onMinimize }) => {
  const { settings } = useAppContext();
  const component = useObsidianComponent() as ComposerHostView;
  const store = useRequiredAppStore();
  const isExpanded = inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED;
  const { viewNoteMode } = useAppStore(
    useShallow((s) => ({
      viewNoteMode: s.viewNoteMode,
    })),
  );
  const capabilities = useMemo(
    () => getDaystreamViewCapabilities({ noteMode: viewNoteMode }),
    [viewNoteMode],
  );
  const {
    date,
    granularity,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleClickHome,
    handleChangeCalendarDateAction,
    displayMode,
    mainView,
    activeTag,
    searchQuery,
    searchInputOpen,
    setDisplayMode,
    setActiveTag,
    setThreadFocusRootId,
  } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      granularity: s.granularity,
      handleClickMovePrevious: s.handleClickMovePrevious,
      handleClickMoveNext: s.handleClickMoveNext,
      handleClickHome: s.handleClickHome,
      handleChangeCalendarDateAction: s.handleChangeCalendarDate,
      displayMode: s.displayMode,
      mainView: s.mainView,
      activeTag: s.activeTag,
      searchQuery: s.searchQuery,
      searchInputOpen: s.searchInputOpen,
      setDisplayMode: s.setDisplayMode,
      setActiveTag: s.setActiveTag,
      setThreadFocusRootId: s.setThreadFocusRootId,
    })),
  );

  const { dateFilter, timeFilter, asTask, threadFocusRootId } = useSettingsStore(
    useShallow((s) => ({
      dateFilter: s.dateFilter,
      timeFilter: s.timeFilter,
      asTask: s.asTask,
      threadFocusRootId: s.threadFocusRootId,
    })),
  );

  const isViewDefault = isHomeViewState({
    date,
    mainView,
    displayMode,
    granularity,
    dateFilter,
    timeFilter,
    asTask,
    activeTag,
    threadFocusRootId,
    searchQuery,
    searchInputOpen,
  });

  const isStatusIndicatorVisible =
    activeTag != null || threadFocusRootId != null || displayMode !== DISPLAY_MODE.FOCUS;

  const handleIndicatorClick = useCallback(() => {
    if (activeTag != null) {
      setActiveTag(null);
      return;
    }

    if (threadFocusRootId != null) {
      setThreadFocusRootId(null);
      return;
    }

    setDisplayMode(DISPLAY_MODE.FOCUS);
  }, [activeTag, setActiveTag, setDisplayMode, setThreadFocusRootId, threadFocusRootId]);

  const handleChangeCalendarDate = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleChangeCalendarDateAction(event.target.value);
    },
    [handleChangeCalendarDateAction],
  );

  // const step = getMoveStep();
  return (
    <Flex
      className={`daystream-input-area-control items-center px-[1em] my-[var(--size-4-4)] h-[28px] group`}
    >
      {capabilities.supportsDateNavigation && (
        <IconButton
          name="home"
          tooltip="ホーム"
          size="1.7em"
          onActivate={handleClickHome}
          className={cn(
            isViewDefault ? "" : "text-[var(--text-accent)] hover:text-[var(--text-normal)]",
            // 意図: expand 中は上部バーを畳み、ホバー時だけ一時的に表示する。
            isExpanded && "hidden group-hover:flex",
          )}
        />
      )}
      <Box className="flex-1" />
      <HStack
        className={cn(
          "daystream-control-center justify-center flex-none",
          isExpanded && "hidden group-hover:flex",
        )}
      >
        {!capabilities.supportsDateNavigation ? null : isStatusIndicatorVisible ? (
          <DisplayModeIndicator
            displayMode={displayMode}
            threadFocusRootId={threadFocusRootId}
            activeTag={activeTag}
            onClick={handleIndicatorClick}
          />
        ) : (
          <>
            <NavButton direction="left" onClick={handleClickMovePrevious} />
            <HStack className="daystream-date-controls gap-[0.2em]">
              <Input
                className={`daystream-date-input h-[28px] text-[90%] pl-[var(--size-4-6)] ${GRANULARITY_CONFIG[granularity].inputWidthClass}`}
                type={GRANULARITY_CONFIG[granularity].inputType}
                value={date.format(GRANULARITY_CONFIG[granularity].inputFormat)}
                onChange={handleChangeCalendarDate}
              />
            </HStack>
            <NavButton direction="right" onClick={handleClickMoveNext} />
          </>
        )}
      </HStack>
      <Box className="flex-1 flex justify-end gap-[0.5em]">
        <IconButton
          name="maximize"
          tooltip="入力欄を最大化"
          size="1.7em"
          onActivate={() => {
            if (isReadOnly) return;
            onMaximizeToMaxHeight();
          }}
          isDisabled={isReadOnly}
          className={cn(
            isReadOnly
              ? "cursor-default opacity-30"
              : isExpanded
                ? "text-[var(--text-accent)] hover:text-[var(--text-normal)]"
                : "",
          )}
          onContextMenu={(e) => {
            // 意図: 展開方法のメニューは最大化中だけに限定し、通常表示では開かない。
            if (!isExpanded) return;
            showEditorContextMenu(e, {
              editorExpansionMode: settings.editorExpansionMode,
              hasEditorPopout: isEditorAlreadyInSeparateWindow(component),
              onOpenInNewWindow: onMinimize,
              onChangeEditorExpansionMode: (mode) => {
                // 意図: 右クリックから変更した展開モードを設定画面や次回起動にも反映する。
                store.getState().setPluginSettings({ ...settings, editorExpansionMode: mode });
                void component.setEditorExpansionMode(mode);
              },
            });
          }}
        />
      </Box>
    </Flex>
  );
});
