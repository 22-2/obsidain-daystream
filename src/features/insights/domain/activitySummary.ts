import type { Moment } from "moment";
import type { MemoRecord } from "src/core/db/dstr-db";
import { obsidianMoment } from "src/core/platform/obsidian-globals";

const ACTIVITY_DATE_FORMAT = "YYYY-MM-DD";

export interface ActivitySummary {
  dailyCounts: Record<string, number>;
  totalPosts: number;
  activeDays: number;
  tagCount: number;
  firstDate: string | null;
  latestDate: string | null;
}

/** ISO 8601 の日時／日付をローカル時刻の Moment として解釈する。無効な値は isValid() が false になる。 */
export function parseActivityDate(value: string): Moment {
  return obsidianMoment(value, obsidianMoment.ISO_8601);
}

/** 2つの日付のカレンダー上の日数差。時刻や DST の影響を受けない。 */
export function calendarDaysBetween(later: Moment, earlier: Moment): number {
  return later.clone().startOf("day").diff(earlier.clone().startOf("day"), "days");
}

/** ISO日時／日付文字列を、表示するローカル日のキーへ正規化する。 */
export function normalizeActivityDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const parsed = parseActivityDate(value);
  return parsed.isValid() ? parsed.format(ACTIVITY_DATE_FORMAT) : null;
}

/** 集計の日付キーを指定フォーマット（Moment のトークン）で表示する。 */
export function formatActivityDate(
  value: string | null | undefined,
  dateFormat = ACTIVITY_DATE_FORMAT,
): string | null {
  const normalized = normalizeActivityDate(value);
  if (!normalized) return null;

  return parseActivityDate(normalized).format(dateFormat);
}

/** 表示対象の投稿から、右サイドバー用の軽量な集計を作る。 */
export function buildActivitySummary(
  records: MemoRecord[],
  activeTag: string | null,
  tagCount: number,
): ActivitySummary {
  const dailyCounts: Record<string, number> = {};

  for (const record of records) {
    if (record.archived || record.deleted) continue;
    if (activeTag && !(record.tags ?? []).includes(activeTag)) continue;

    const date = normalizeActivityDate(record.noteDate) ?? normalizeActivityDate(record.createdAt);
    if (!date) continue;
    dailyCounts[date] = (dailyCounts[date] ?? 0) + 1;
  }

  const dates = Object.keys(dailyCounts).sort();
  return {
    dailyCounts,
    totalPosts: Object.values(dailyCounts).reduce((sum, count) => sum + count, 0),
    activeDays: dates.length,
    tagCount,
    firstDate: dates[0] ?? null,
    latestDate: dates.at(-1) ?? null,
  };
}
