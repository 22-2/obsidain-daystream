import { useEffect, useRef, useState } from "react";
import { HStack, Input } from "src/core/ui/components/primitives";
import { useRequiredAppStore } from "src/features/workspace/store/appStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { useObsidianTooltip } from "src/core/ui/hooks/useObsidianTooltip";
import { useShallow } from "zustand/shallow";

export function HierarchicalDateInput() {
  const yearTooltipRef = useObsidianTooltip("年");
  const monthTooltipRef = useObsidianTooltip("月");
  const dayTooltipRef = useObsidianTooltip("日");
  const store = useRequiredAppStore();
  const { date, granularity } = useSettingsStore(
    useShallow((state) => ({ date: state.date, granularity: state.granularity })),
  );
  const [yearDraft, setYearDraft] = useState(String(date.year()));
  const yearIsDirty = useRef(false);
  const monthValue = granularity === "year" ? "" : String(date.month() + 1);
  const dayValue = granularity === "day" ? String(date.date()) : "";
  const parsedYear = Number(yearDraft);
  const hasValidYear = Number.isInteger(parsedYear) && parsedYear >= 1 && parsedYear <= 9999;
  const daysInMonth = date
    .clone()
    .year(hasValidYear ? parsedYear : date.year())
    .month(Number(monthValue || date.month() + 1) - 1)
    .daysInMonth();

  useEffect(() => {
    setYearDraft(String(date.year()));
    yearIsDirty.current = false;
  }, [date]);

  const applyYear = (value: string): boolean => {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 1 || year > 9999) return false;

    yearIsDirty.current = false;
    const state = store.getState();
    // 意図: 年を変えた直後は年月日のうち年だけを指定した状態にし、古い月日を引き継がない。
    state.setDate(state.date.clone().year(year).startOf("year"));
    state.setGranularity("year");
    return true;
  };

  const commitYear = () => {
    if (!yearIsDirty.current) return;
    if (!applyYear(yearDraft)) {
      yearIsDirty.current = false;
      setYearDraft(String(store.getState().date.year()));
    }
  };

  const changeMonth = (value: string) => {
    const state = store.getState();
    if (!value) {
      state.setDate(state.date.clone().year(parsedYear).startOf("year"));
      state.setGranularity("year");
      return;
    }

    state.setDate(state.date.clone().year(parsedYear).month(Number(value) - 1).startOf("month"));
    state.setGranularity("month");
  };

  const changeDay = (value: string) => {
    const state = store.getState();
    if (!value) {
      state.setDate(state.date.clone().startOf("month"));
      state.setGranularity("month");
      return;
    }

    state.setDate(state.date.clone().date(Number(value)));
    state.setGranularity("day");
  };

  return (
    <HStack className="mfdi-hierarchical-date-input gap-1">
      <Input
        ref={yearTooltipRef}
        className="mfdi-date-input h-8 w-[5em] px-1 text-[length:var(--font-ui-smaller)]"
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
          if (/^\d{4}$/.test(nextYear)) applyYear(nextYear);
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
        className="mfdi-date-input h-8 w-[3.5em] px-1 text-[length:var(--font-ui-smaller)]"
        disabled={!hasValidYear}
        value={monthValue}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => changeMonth(event.target.value)}
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
        className="mfdi-date-input h-8 w-[3.5em] px-1 text-[length:var(--font-ui-smaller)]"
        disabled={!hasValidYear || !monthValue}
        value={dayValue}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => changeDay(event.target.value)}
      >
        <option value="">日</option>
        {Array.from({ length: daysInMonth }, (_, index) => (
          <option key={index + 1} value={String(index + 1)}>
            {String(index + 1).padStart(2, "0")}日
          </option>
        ))}
      </select>
    </HStack>
  );
}
