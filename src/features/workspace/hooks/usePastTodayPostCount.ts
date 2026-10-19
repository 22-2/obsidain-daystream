import { obsidianMoment } from "src/core/platform/obsidian-globals";
import { useEffect } from "react";
import { subscribeToDBUpdates } from "src/core/db/updates";
import type { IDBService } from "src/core/db/interfaces/IDBService";
import { useDSTRDB } from "src/core/db/hooks/useDSTRDB";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { MomentLike } from "src/core/domain/post";
import { isVisibleRootPost, memoRecordToPost } from "src/features/posts/utils/thread-utils";
import useSWR from "swr";
import { useShallow } from "zustand/shallow";

const PAST_TODAY_FETCH_LIMIT = 10_000;

function getPastTodayYears(activeDates: string[], targetDate: MomentLike) {
  const years = new Set<number>();

  for (const activeDate of activeDates) {
    const parsedDate = obsidianMoment(activeDate, "YYYY-MM-DD", true);
    if (!parsedDate.isValid() || parsedDate.year() >= targetDate.year()) {
      continue;
    }
    years.add(parsedDate.year());
  }

  return [...years].sort((left, right) => right - left);
}

/**
 * 指定日の過去の同月日について、一覧に表示されるルート投稿数を数える。
 * active dates から対象年だけを先に絞ることで、全投稿の取得を避ける。
 */
export async function fetchPastTodayPostCount(
  db: Pick<IDBService, "getAllActiveDates" | "getMemos">,
  targetDate: MomentLike,
  activeTopic?: string,
): Promise<number> {
  const activeDates = await db.getAllActiveDates();
  const years = getPastTodayYears(activeDates, targetDate);

  const records = (
    await Promise.all(
      years.map(async (year) => {
        const pastDate = targetDate.clone().year(year);

        // 2月29日はうるう年にだけ存在するため、存在しない年は数えない。
        if (pastDate.month() !== targetDate.month() || pastDate.date() !== targetDate.date()) {
          return [];
        }

        return await db.getMemos({
          ...(activeTopic ? { topicId: activeTopic } : {}),
          startDate: pastDate.clone().startOf("day").toISOString(),
          endDate: pastDate.clone().endOf("day").toISOString(),
          limit: PAST_TODAY_FETCH_LIMIT,
        });
      }),
    )
  ).flat();

  return records.map(memoRecordToPost).filter(isVisibleRootPost).length;
}

/** 現在のフォーカス日について「過去の今日」の案内件数を取得するHook。 */
export function usePastTodayPostCount(): {
  count: number;
  isLoading: boolean;
} {
  const db = useDSTRDB();
  const { activeTopic, date, dateFilter, granularity, viewNoteMode } = useSettingsStore(
    useShallow((state) => ({
      activeTopic: state.activeTopic,
      date: state.date,
      dateFilter: state.dateFilter,
      granularity: state.granularity,
      viewNoteMode: state.viewNoteMode,
    })),
  );

  const enabled = viewNoteMode === "periodic" && granularity === "day" && dateFilter === "today";
  const dateKey = date.format("YYYY-MM-DD");

  const { data, error, mutate } = useSWR<number, Error>(
    enabled ? ["past-today-post-count", activeTopic || "all", dateKey] : null,
    async () => fetchPastTodayPostCount(db, date, activeTopic || undefined),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  useEffect(() => {
    if (!enabled) return;
    return subscribeToDBUpdates(() => void mutate());
  }, [enabled, mutate]);

  return {
    count: data ?? 0,
    isLoading: enabled && data === undefined && !error,
  };
}
