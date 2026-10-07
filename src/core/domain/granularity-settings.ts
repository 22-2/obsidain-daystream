import type { Granularity } from "src/core/domain/granularity";

type Periodicity = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
type GranularitySettingsSource = "daily-notes" | "calendar" | "periodic-notes";

export interface GranularitySettings {
  periodicity: Periodicity;
  source: GranularitySettingsSource;
  defaultFormat: string;
  usePeriodicNotesWhenEnabled: boolean;
}

// 意図: ノート設定の参照元と既定書式を UI 表示設定から独立させる。
export const GRANULARITY_SETTINGS: Record<Granularity, GranularitySettings> = {
  day: {
    periodicity: "daily",
    source: "daily-notes",
    defaultFormat: "YYYY-MM-DD",
    usePeriodicNotesWhenEnabled: true,
  },
  week: {
    periodicity: "weekly",
    source: "calendar",
    defaultFormat: "gggg-[W]ww",
    usePeriodicNotesWhenEnabled: true,
  },
  month: {
    periodicity: "monthly",
    source: "periodic-notes",
    defaultFormat: "YYYY-MM",
    usePeriodicNotesWhenEnabled: false,
  },
  quarter: {
    periodicity: "quarterly",
    source: "periodic-notes",
    defaultFormat: "YYYY-[Q]Q",
    usePeriodicNotesWhenEnabled: false,
  },
  year: {
    periodicity: "yearly",
    source: "periodic-notes",
    defaultFormat: "YYYY",
    usePeriodicNotesWhenEnabled: false,
  },
};
