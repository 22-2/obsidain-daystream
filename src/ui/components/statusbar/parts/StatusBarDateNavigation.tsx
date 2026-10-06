import type { ChangeEvent, FC } from "react";
import { useCallback, useMemo } from "react";
import { useObsidianTooltip } from "src/ui/hooks/useObsidianTooltip";
import { NavButton } from "src/ui/components/common/NavButton";
import { DisplayModeIndicator } from "src/ui/components/inputarea/DisplayModeIndicator";
import { HStack, Input } from "src/ui/components/primitives";
import { HierarchicalDateInput } from "src/ui/components/statusbar/parts/HierarchicalDateInput";
import { StatusBarHome } from "src/ui/components/statusbar/parts/StatusBarHome";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { useAppStore } from "src/ui/store/appStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { getMFDIViewCapabilities } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

export const StatusBarDateNavigation: FC = () => {
  const dateTooltipRef = useObsidianTooltip("表示日");
  const { viewNoteMode } = useAppStore(useShallow((s) => ({ viewNoteMode: s.viewNoteMode })));
  const capabilities = useMemo(
    () => getMFDIViewCapabilities({ noteMode: viewNoteMode }),
    [viewNoteMode],
  );
  const {
    date,
    granularity,
    displayMode,
    activeTag,
    threadFocusRootId,
    handleClickMovePrevious,
    handleClickMoveNext,
    handleChangeCalendarDate,
    setDisplayMode,
    setActiveTag,
    setThreadFocusRootId,
  } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      granularity: s.granularity,
      displayMode: s.displayMode,
      activeTag: s.activeTag,
      threadFocusRootId: s.threadFocusRootId,
      handleClickMovePrevious: s.handleClickMovePrevious,
      handleClickMoveNext: s.handleClickMoveNext,
      handleChangeCalendarDate: s.handleChangeCalendarDate,
      setDisplayMode: s.setDisplayMode,
      setActiveTag: s.setActiveTag,
      setThreadFocusRootId: s.setThreadFocusRootId,
    })),
  );
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

  const handleChangeDate = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleChangeCalendarDate(event.target.value);
    },
    [handleChangeCalendarDate],
  );

  const hasHierarchicalDate =
    granularity === "day" || granularity === "month" || granularity === "year";

  if (!capabilities.supportsDateNavigation) return null;

  return (
    <HStack className="mfdi-statusbar-date-bar flex-none gap-1">
      {/* 意図: ホームも日付操作と同じ並びに置き、背景のないバーで単独に浮いて見えるのを防ぐ。 */}
      <StatusBarHome />
      {isStatusIndicatorVisible ? (
        <DisplayModeIndicator
          displayMode={displayMode}
          threadFocusRootId={threadFocusRootId}
          activeTag={activeTag}
          onClick={handleIndicatorClick}
          className="text-[length:var(--font-ui-smaller)]"
        />
      ) : (
        <>
          <NavButton direction="left" onClick={handleClickMovePrevious} className="p-1" />
          {hasHierarchicalDate ? (
            <HierarchicalDateInput />
          ) : (
            <Input
              ref={dateTooltipRef}
              className={`mfdi-date-input h-[32px] text-[length:var(--font-ui-smaller)] pl-[var(--size-4-6)] ${GRANULARITY_CONFIG[granularity].inputWidthClass}`}
              type={GRANULARITY_CONFIG[granularity].inputType}
              value={date.format(GRANULARITY_CONFIG[granularity].inputFormat)}
              onChange={handleChangeDate}
              onClick={(event) => event.stopPropagation()}
            />
          )}
          <NavButton direction="right" onClick={handleClickMoveNext} className="p-1" />
        </>
      )}
    </HStack>
  );
};
