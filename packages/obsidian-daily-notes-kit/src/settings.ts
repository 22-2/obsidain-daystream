import { GRANULARITY_SETTINGS, type Granularity } from "./granularity";
import type { DailyNotesHost } from "./host";

export interface NoteSettings {
  format: string;
  folder: string;
  template: string;
}

type PeriodicNotesEntry = {
  enabled: boolean;
  format?: string;
  folder?: string;
  template?: string;
};

interface PeriodicNotesPlugin {
  settings: {
    [periodicity: string]: PeriodicNotesEntry | undefined;
  };
}

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

function getPeriodicNotesEntry(
  host: DailyNotesHost,
  periodicity: string,
): PeriodicNotesEntry | undefined {
  return host.getCommunityPlugin<PeriodicNotesPlugin>("periodic-notes")?.settings?.[periodicity];
}

function normalizePeriodicSettings(
  entry: PeriodicNotesEntry | undefined,
  defaultFormat: string,
  fallbackFolder: string,
): NoteSettings {
  return {
    format: entry?.format || defaultFormat,
    folder: entry?.folder?.trim() || fallbackFolder,
    template: entry?.template?.trim() || "",
  };
}

function getDailyNotesFallbackSettings(
  host: DailyNotesHost,
  defaultFormat: string,
): NoteSettings {
  const dailyOptions =
    host.getInternalPluginById<DailyNotesPlugin>("daily-notes")?.instance?.options;
  return {
    format: dailyOptions?.format || defaultFormat,
    folder: dailyOptions?.folder?.trim() || "",
    template: dailyOptions?.template?.trim() || "",
  };
}

function getCalendarFallbackSettings(
  host: DailyNotesHost,
  defaultFormat: string,
  fallbackFolder: string,
): NoteSettings {
  const calendarSettings = host.getCommunityPlugin<CalendarPlugin>("calendar")?.options;
  return {
    format: calendarSettings?.weeklyNoteFormat || defaultFormat,
    folder: calendarSettings?.weeklyNoteFolder?.trim() || fallbackFolder,
    template: calendarSettings?.weeklyNoteTemplate?.trim() || "",
  };
}

/**
 * granularity に対応するノート設定を、有効なプラグインの設定から解決する。
 */
export function getNoteSettings(
  host: DailyNotesHost,
  granularity: Granularity,
): NoteSettings {
  const { defaultFormat, periodicity, source, usePeriodicNotesWhenEnabled } =
    GRANULARITY_SETTINGS[granularity];

  try {
    const dailyFolder = getDailyNotesFallbackSettings(host, defaultFormat).folder;
    const periodicEntry = getPeriodicNotesEntry(host, periodicity);

    if (source === "periodic-notes") {
      return normalizePeriodicSettings(periodicEntry, defaultFormat, dailyFolder);
    }

    if (usePeriodicNotesWhenEnabled && periodicEntry?.enabled) {
      return normalizePeriodicSettings(periodicEntry, defaultFormat, dailyFolder);
    }

    if (source === "calendar") {
      return getCalendarFallbackSettings(host, defaultFormat, dailyFolder);
    }

    return getDailyNotesFallbackSettings(host, defaultFormat);
  } catch {
    return { format: defaultFormat, folder: "", template: "" };
  }
}
