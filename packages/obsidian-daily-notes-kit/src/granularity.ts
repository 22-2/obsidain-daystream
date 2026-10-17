export const GRANULARITIES = ["day", "week", "month", "quarter", "year"] as const;

export type Granularity = (typeof GRANULARITIES)[number];

type Periodicity = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
type GranularitySettingsSource = "daily-notes" | "calendar" | "periodic-notes";

export interface GranularitySettings {
  periodicity: Periodicity;
  source: GranularitySettingsSource;
  defaultFormat: string;
  usePeriodicNotesWhenEnabled: boolean;
}

// 意図: granularity ごとの設定源と既定書式を単一テーブルに寄せて、粒度追加時の分岐漏れを防ぐ。
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
