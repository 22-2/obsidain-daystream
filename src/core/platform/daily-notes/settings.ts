import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { GRANULARITY_SETTINGS } from "src/core/domain/granularity-settings";
import type { Granularity } from "src/core/domain/granularity";

interface PeriodicNoteSettings {
  format: string;
  folder: string;
  template: string;
}

interface PeriodicNotesPlugin {
  settings: {
    [key: string]:
      | {
          enabled: boolean;
          format?: string;
          folder?: string;
          template?: string;
        }
      | undefined;
  };
}

type Periodicity = "daily" | "weekly" | "monthly" | "yearly";
type PeriodicNotesEntry = {
  enabled: boolean;
  format?: string;
  folder?: string;
  template?: string;
};

interface DailyNotesPlugin {
  instance: {
    options: {
      format?: string;
      folder?: string;
      template?: string;
    };
  };
}

interface CalendarPlugin {
  options: {
    weeklyNoteFormat?: string;
    weeklyNoteFolder?: string;
    weeklyNoteTemplate?: string;
  };
}

function shouldUsePeriodicNotesSettings(
  shell: ObsidianAppShell,
  periodicity: Periodicity | "quarterly",
): boolean {
  const periodicNotes = shell.getCommunityPlugin<PeriodicNotesPlugin>("periodic-notes");
  return !!(periodicNotes && periodicNotes.settings?.[periodicity]?.enabled);
}

function getPeriodicNotesSettings(shell: ObsidianAppShell, periodicity: Periodicity | "quarterly") {
  const periodicNotes = shell.getCommunityPlugin<PeriodicNotesPlugin>("periodic-notes");
  return periodicNotes?.settings?.[periodicity] as PeriodicNotesEntry | undefined;
}

function normalizePeriodicSettings(
  entry: PeriodicNotesEntry | undefined,
  defaultFormat: string,
): PeriodicNoteSettings {
  return {
    format: entry?.format || defaultFormat,
    folder: entry?.folder?.trim() || "",
    template: entry?.template?.trim() || "",
  };
}

function getDailyNotesFallbackSettings(
  shell: ObsidianAppShell,
  defaultFormat: string,
): PeriodicNoteSettings {
  const dailyOptions =
    shell.getInternalPluginById<DailyNotesPlugin>("daily-notes")?.instance?.options;
  return {
    format: dailyOptions?.format || defaultFormat,
    folder: dailyOptions?.folder?.trim() || "",
    template: dailyOptions?.template?.trim() || "",
  };
}

function getCalendarFallbackSettings(
  shell: ObsidianAppShell,
  defaultFormat: string,
): PeriodicNoteSettings {
  const calendarSettings = shell.getCommunityPlugin<CalendarPlugin>("calendar")?.options;
  return {
    format: calendarSettings?.weeklyNoteFormat || defaultFormat,
    folder: calendarSettings?.weeklyNoteFolder?.trim() || "",
    template: calendarSettings?.weeklyNoteTemplate?.trim() || "",
  };
}

function resolveGranularitySettings(
  shell: ObsidianAppShell,
  granularity: Granularity,
): PeriodicNoteSettings {
  const { defaultFormat, periodicity, source, usePeriodicNotesWhenEnabled } =
    GRANULARITY_SETTINGS[granularity];

  try {
    const periodicSettings = getPeriodicNotesSettings(shell, periodicity);

    // 意図: granularity ごとの設定源を単一テーブルに寄せて、UI追加時に settings 側の分岐漏れを防ぐ。
    if (source === "periodic-notes") {
      return normalizePeriodicSettings(periodicSettings, defaultFormat);
    }

    if (usePeriodicNotesWhenEnabled && shouldUsePeriodicNotesSettings(shell, periodicity)) {
      return normalizePeriodicSettings(periodicSettings, defaultFormat);
    }

    if (source === "calendar") {
      return getCalendarFallbackSettings(shell, defaultFormat);
    }

    return getDailyNotesFallbackSettings(shell, defaultFormat);
  } catch {
    return { format: defaultFormat, folder: "", template: "" };
  }
}

export function getDailyNoteSettings(shell: ObsidianAppShell): PeriodicNoteSettings {
  return resolveGranularitySettings(shell, "day");
}

function getWeeklyNoteSettings(shell: ObsidianAppShell): PeriodicNoteSettings {
  return resolveGranularitySettings(shell, "week");
}

export function getMonthlyNoteSettings(shell: ObsidianAppShell): PeriodicNoteSettings {
  return resolveGranularitySettings(shell, "month");
}

export function getQuarterlyNoteSettings(shell: ObsidianAppShell): PeriodicNoteSettings {
  return resolveGranularitySettings(shell, "quarter");
}

export function getYearlyNoteSettings(shell: ObsidianAppShell): PeriodicNoteSettings {
  return resolveGranularitySettings(shell, "year");
}

export function getPeriodicSettings(g: Granularity, shell: ObsidianAppShell): PeriodicNoteSettings {
  return resolveGranularitySettings(shell, g);
}
