import { useEffect, useRef, useState } from "react";
import { HStack, Input } from "src/core/ui/components/primitives";
import { useRequiredAppStore } from "src/features/workspace/store/appStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { useObsidianTooltip } from "src/core/ui/hooks/useObsidianTooltip";
import { obsidianMoment } from "src/core/platform/obsidian-globals";
import { getDateSelection, type DateSelection } from "src/features/workspace/utils/date-selection";
import { useShallow } from "zustand/shallow";

export function HierarchicalDateInput() {
  const yearTooltipRef = useObsidianTooltip("年");
  const monthTooltipRef = useObsidianTooltip("月");
  const dayTooltipRef = useObsidianTooltip("日");
  const store = useRequiredAppStore();
  const { date, granularity, dateSelection } = useSettingsStore(
    useShallow((state) => ({
      date: state.date,
      granularity: state.granularity,
      dateSelection: state.dateSelection,
    })),
  );
  const selection = dateSelection ?? getDateSelection(date, granularity);
  const yearValue = selection.year === null ? "" : String(selection.year);
  const [yearDraft, setYearDraft] = useState(yearValue);
  const yearIsDirty = useRef(false);
  const monthValue = selection.month === null ? "" : String(selection.month);
  const dayValue = selection.day === null ? "" : String(selection.day);
  // 意図: 年未指定の2月はうるう年も検索でき、月未指定なら31日まで選べる。
  const daysInMonth = selection.month === null ? 31 : obsidianMoment({
    year: selection.year ?? 2000,
    month: selection.month - 1,
    date: 1,
  }).daysInMonth();

  useEffect(() => {
    setYearDraft(yearValue);
    yearIsDirty.current = false;
  }, [yearValue]);

  const changeSelection = (patch: Partial<DateSelection>) => {
    const state = store.getState();
    state.setDateSelection({
      ...(state.dateSelection ?? getDateSelection(state.date, state.granularity)),
      ...patch,
    });
  };

  const applyYear = (value: string): boolean => {
    const year = value === "" ? null : Number(value);
    if (year !== null && (!Number.isInteger(year) || year < 1 || year > 9999)) return false;
    yearIsDirty.current = false;
    changeSelection({ year });
    return true;
  };

  const commitYear = () => {
    if (!yearIsDirty.current) return;
    if (!applyYear(yearDraft)) {
      yearIsDirty.current = false;
      setYearDraft(yearValue);
    }
  };

  return (
    <HStack className="dstr-hierarchical-date-input gap-1">
      <Input
        ref={yearTooltipRef}
        className="dstr-date-input h-8 w-[5em] px-1 text-[length:var(--font-ui-smaller)]"
        max={9999}
        min={1}
        type="number"
        value={yearDraft}
        onBlur={commitYear}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const nextYear = event.target.value;
          yearIsDirty.current = true;
          setYearDraft(nextYear);
          // 意図: 入力途中の数字では検索しない。4桁の年になった時点でフォーカスアウトを待たず反映する。
          if (nextYear === "" || /^\d{4}$/.test(nextYear)) applyYear(nextYear);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitYear();
          }
        }}
      />
      <select
        ref={monthTooltipRef}
        className="dstr-date-input h-8 w-[3.5em] px-1 text-[length:var(--font-ui-smaller)]"
        value={monthValue}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => changeSelection({ month: event.target.value ? Number(event.target.value) : null })}
      >
        <option value="">月</option>
        {Array.from({ length: 12 }, (_, index) => (
          <option key={index + 1} value={String(index + 1)}>
            {String(index + 1).padStart(2, "0")}月
          </option>
        ))}
      </select>
      <select
        ref={dayTooltipRef}
        className="dstr-date-input h-8 w-[3.5em] px-1 text-[length:var(--font-ui-smaller)]"
        value={dayValue}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => changeSelection({ day: event.target.value ? Number(event.target.value) : null })}
      >
        <option value="">日</option>
        {Array.from({ length: Math.max(daysInMonth, selection.day ?? 0) }, (_, index) => (
          <option key={index + 1} value={String(index + 1)}>
            {String(index + 1).padStart(2, "0")}日
          </option>
        ))}
      </select>
    </HStack>
  );
}
