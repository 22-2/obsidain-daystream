import { useEffect } from "react";
import type { IDBService } from "src/db/interfaces/IDBService";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { MomentLike } from "src/ui/types";
import { isVisibleRootPost, memoRecordToPost } from "src/ui/utils/thread-utils";
import useSWR from "swr";
import { useShallow } from "zustand/shallow";

const PAST_TODAY_FETCH_LIMIT = 10_000;

function getPastTodayYears(activeDates: string[], targetDate: MomentLike) {
  const years = new Set<number>();

  for (const activeDate of activeDates) {
    const parsedDate = window.moment(activeDate, "YYYY-MM-DD", true);
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
        if (
          pastDate.month() !== targetDate.month() ||
          pastDate.date() !== targetDate.date()
        ) {
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
  const db = useMFDIDB();
  const { activeTopic, asTask, date, dateFilter, granularity, viewNoteMode } =
    useSettingsStore(
      useShallow((state) => ({
        activeTopic: state.activeTopic,
        asTask: state.asTask,
        date: state.date,
        dateFilter: state.dateFilter,
        granularity: state.granularity,
        viewNoteMode: state.viewNoteMode,
      })),
    );

  const enabled =
    viewNoteMode === "periodic" &&
    granularity === "day" &&
    dateFilter === "today" &&
    !asTask;
  const dateKey = date.format("YYYY-MM-DD");

  const { data, error, mutate } = useSWR<number>(
    enabled ? ["past-today-post-count", activeTopic || "all", dateKey] : null,
    async () => fetchPastTodayPostCount(db, date, activeTopic || undefined),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("mfdi-db-updates");
    channel.onmessage = (event) => {
      if (event?.data?.type === "mfdi-db-updated") {
        void mutate();
      }
    };

    return () => channel.close();
  }, [enabled, mutate]);

  return {
    count: data ?? 0,
    isLoading: enabled && data === undefined && !error,
  };
}
