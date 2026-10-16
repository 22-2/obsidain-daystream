import { format, isValid, parseISO } from "date-fns";
import type { MemoRecord } from "src/core/db/daystream-db";

const ACTIVITY_DATE_FORMAT = "yyyy-MM-dd";

export interface ActivitySummary {
  dailyCounts: Record<string, number>;
  totalPosts: number;
  activeDays: number;
  tagCount: number;
  firstDate: string | null;
  latestDate: string | null;
}

/** ISO日時／日付文字列を、表示するローカル日のキーへ正規化する。 */
export function normalizeActivityDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, ACTIVITY_DATE_FORMAT) : null;
}

/** 集計の日付キーを指定フォーマットで表示する。 */
export function formatActivityDate(
  value: string | null | undefined,
  dateFormat = ACTIVITY_DATE_FORMAT,
): string | null {
  const normalized = normalizeActivityDate(value);
  if (!normalized) return null;

  return format(parseISO(normalized), dateFormat);
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
