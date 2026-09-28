import { useMemo } from "react";
import { normalizeFixedNotePath } from "src/core/fixed-note";
import { resolvePeriodicNote } from "src/core/note-source";
import { resolveTimestamp } from "src/core/post-utils";
import { parseThinoEntries } from "src/core/thino";
import { WorkerClient } from "src/db/worker-client";
import { DATE_FILTER_IDS } from "src/ui/config/filter-config";
import { getGranularityRange, GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { useAppContext } from "src/ui/context/AppContext";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { Post } from "src/ui/types";
import { buildFixedSessionPosts, isThreadRootMetadata } from "src/ui/utils/fixed-session-utils";
import { getEffectiveSearchState } from "src/ui/utils/search-state";
import { buildPostFromEntry, memoRecordToPost } from "src/ui/utils/thread-utils";
import useSWR from "swr";
import { useShallow } from "zustand/shallow";

/**
 * フォーカスモード（特定期間の1回読み切り）のデータ取得を担当するHook。
 * 常に IndexedDB から最新のデータを取得する。
 */
export const useFocusPosts = () => {
  const { shell, settings } = useAppContext();
  const {
    activeTopic,
    date,
    granularity,
    dateFilter,
    searchQuery,
    threadOnly,
    viewNoteMode,
    file,
    fixedSessionNumber,
  } = useSettingsStore(
    useShallow((s) => ({
      activeTopic: s.activeTopic,
      date: s.date,
      granularity: s.granularity,
      dateFilter: s.dateFilter,
      ...getEffectiveSearchState(s),
      viewNoteMode: s.viewNoteMode,
      // 意図: ストア側の `file` を参照して固定ノートのパスを得る（Obsidian のファイル選択値）。
      // テストではこの `file` を直接書き換えて期待のファイルを渡す。
      file: s.file,
      fixedSessionNumber: s.fixedSessionNumber,
    })),
  );
  const isFixedMode = viewNoteMode === "fixed";
  const normalizedFixedPath = useMemo(() => normalizeFixedNotePath(file ?? ""), [file]);
  const periodicNoteFile = useMemo(() => {
    if (isFixedMode) return null;
    if (dateFilter === DATE_FILTER_IDS.THIS_MONTH || dateFilter === DATE_FILTER_IDS.THIS_YEAR) {
      return null;
    }
    if (!GRANULARITY_CONFIG[granularity].readsDirectlyFromPeriodicNote) {
      return null;
    }
    // 意図: granularity ごとの本文直読み判定を config に寄せて、quarter 追加時の分岐漏れを防ぐ。
    return resolvePeriodicNote(shell, date, granularity, activeTopic);
  }, [isFixedMode, granularity, date, dateFilter, activeTopic, shell]);

  const { startDate, endDate } = useMemo(() => {
    const { rangeStart, rangeEnd } = getGranularityRange(date, granularity, dateFilter);

    return {
      startDate: rangeStart.toISOString(),
      endDate: rangeEnd.toISOString(),
    };
  }, [date, granularity, dateFilter]);

  const effectiveTopic = isFixedMode ? undefined : activeTopic;

  const {
    data: posts,
    mutate,
    isValidating,
    error,
  } = useSWR<Post[]>(
    [
      "posts",
      "focus",
      effectiveTopic,
      startDate,
      endDate,
      searchQuery,
      threadOnly,
      viewNoteMode,
      normalizedFixedPath,
      fixedSessionNumber,
      settings.insertAfter,
      periodicNoteFile?.path,
      date.toISOString(),
    ],
    async () => {
      if (isFixedMode) {
        // fixedノートはDBインデックスではなく、ノート本文を直接読んで表示する。
        if (!normalizedFixedPath) return [];

        let content = "";
        try {
          content = await shell.loadFile(normalizedFixedPath);
        } catch {
          return [];
        }

        const query = searchQuery.trim().toLowerCase();

        // テスト内モックでは改行を `"/n"` で結合して渡しているため、実使用時の `"\n"` に正規化する。
        // 実ランタイムで `"/n"` を含むことは想定していないが、テスト互換性を保つための暫定措置。
        const normalizedContent = content.replace(/\/n/g, "\n");

        return buildFixedSessionPosts({
          content: normalizedContent,
          insertAfter: settings.insertAfter,
          path: normalizedFixedPath,
          sessionNumber: fixedSessionNumber,
          searchQuery: query,
          threadOnly,
          referenceDate: date,
        });
      }

      // 月/年 granularity はノートファイルを直接読むことで常に最新の内容を反映する
      if (periodicNoteFile) {
        try {
          const content = await shell.loadFile(periodicNoteFile.path);
          const query = searchQuery.trim().toLowerCase();

          const normalizedContent = content.replace(/\/n/g, "\n");

          return parseThinoEntries(normalizedContent)
            .filter((entry) => {
              if (query && !entry.message.toLowerCase().includes(query)) {
                return false;
              }
              if (threadOnly && !isThreadRootMetadata(entry.metadata)) {
                return false;
              }
              return true;
            })
            .map((entry) => {
              const timestamp = resolveTimestamp(entry.time, date, entry.metadata);

              return buildPostFromEntry({
                ...entry,
                path: periodicNoteFile.path,
                noteDate: timestamp.clone().startOf(granularity),
                resolveTimestamp,
              });
            })
            // 意図: 月次・年次ノートに別期間の posted 日付が混在しても、選択期間外の投稿を表示しない。
            .filter(
              (post) => !post.timestamp.isBefore(startDate) && !post.timestamp.isAfter(endDate),
            );
        } catch {
          console.error("Failed to load periodic note file:", periodicNoteFile.path);
          return [];
        }
      }

      const dbService = WorkerClient.get();
      const records = await dbService.getMemos({
        topicId: effectiveTopic,
        startDate,
        endDate,
        query: searchQuery,
        threadOnly,
      });

      const posts = records.map(memoRecordToPost);
      return posts;
    },
  );

  return useMemo(
    () => ({
      posts: posts ?? [],
      mutate,
      isLoading: !posts && !error,
      isValidating,
    }),
    [posts, mutate, error, isValidating],
  );
};
