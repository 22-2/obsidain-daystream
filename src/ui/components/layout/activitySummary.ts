import type { MemoRecord } from "src/db/mfdi-db";

export interface ActivitySummary {
  dailyCounts: Record<string, number>;
  totalPosts: number;
  activeDays: number;
  tagCount: number;
  firstDate: string | null;
  latestDate: string | null;
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

    const date = record.noteDate || record.createdAt.slice(0, 10);
    if (!date) continue;
    dailyCounts[date] = (dailyCounts[date] ?? 0) + 1;
  }

  const dates = Object.keys(dailyCounts).sort();
  return {
    dailyCounts,
    totalPosts: Object.values(dailyCounts).reduce(
      (sum, count) => sum + count,
      0,
    ),
    activeDays: dates.length,
    tagCount,
    firstDate: dates[0] ?? null,
    latestDate: dates.at(-1) ?? null,
  };
}
