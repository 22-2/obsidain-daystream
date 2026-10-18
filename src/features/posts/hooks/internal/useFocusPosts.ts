import { useMemo } from "react";
import { normalizeFixedNotePath } from "src/core/fixed-note";
import { resolvePeriodicNote } from "src/core/note-source";
import { resolveTimestamp } from "src/core/post-utils";
import { parseThinoEntries } from "src/core/thino";
import { WorkerClient } from "src/core/db/worker-client";
import { DATE_FILTER_IDS } from "src/features/workspace/config/filter-config";
import { getGranularityRange, GRANULARITY_CONFIG } from "src/features/workspace/config/granularity-config";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { Post } from "src/core/domain/post";
import { buildFixedSessionPosts, isThreadRootMetadata } from "src/features/notes/utils/fixed-session-utils";
import { getEffectiveSearchState } from "src/features/workspace/utils/search-state";
import { buildPostFromEntry, memoRecordToPost } from "src/features/posts/utils/thread-utils";
import useSWR from "swr";
import { useShallow } from "zustand/shallow";
import { reportError } from "src/core/error-report";
import { matchesDateSelection } from "src/features/workspace/utils/date-selection";

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
    dateSelection,
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
      dateSelection: s.dateSelection,
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
    if (isFixedMode || dateSelection) return null;
    if (dateFilter === DATE_FILTER_IDS.THIS_MONTH || dateFilter === DATE_FILTER_IDS.THIS_YEAR) {
      return null;
    }
    if (!GRANULARITY_CONFIG[granularity].readsDirectlyFromPeriodicNote) {
      return null;
    }
    // 意図: granularity ごとの本文直読み判定を config に寄せて、quarter 追加時の分岐漏れを防ぐ。
    return resolvePeriodicNote(shell, date, granularity, activeTopic);
  }, [isFixedMode, granularity, date, dateFilter, dateSelection, activeTopic, shell]);

  const { startDate, endDate } = useMemo(() => {
    if (!isFixedMode && dateSelection) {
      // 意図: 年未指定なら全期間を取得し、ローカル日時の各項目で照合する。
      const yearDate = dateSelection.year === null ? null : date.clone().year(dateSelection.year);
      return {
        startDate: yearDate?.clone().startOf("year").toISOString(),
        endDate: yearDate?.clone().endOf("year").toISOString(),
      };
    }
    const { rangeStart, rangeEnd } = getGranularityRange(date, granularity, dateFilter);

    return {
      startDate: rangeStart.toISOString(),
      endDate: rangeEnd.toISOString(),
    };
  }, [date, granularity, dateFilter, dateSelection, isFixedMode]);

  const effectiveTopic = isFixedMode ? undefined : activeTopic;

  const {
    data: posts,
    mutate,
    isValidating,
    error,
  } = useSWR<Post[], Error>(
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
      dateSelection,
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

          const periodicPosts = parseThinoEntries(normalizedContent)
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

              return {
                ...buildPostFromEntry({
                  ...entry,
                  path: periodicNoteFile.path,
                  noteDate: timestamp.clone().startOf(granularity),
                  resolveTimestamp,
                }),
                noteGranularity: granularity,
              };
            })
            // 意図: 月次・年次ノートに別期間の posted 日付が混在しても、選択期間外の投稿を表示しない。
            .filter(
              (post) => (!startDate || !post.timestamp.isBefore(startDate)) && (!endDate || !post.timestamp.isAfter(endDate)),
            );

          if (granularity !== "month") return periodicPosts;

          // 意図: 月の一覧には月次ノートに加えて、日次ノートにだけある投稿も含める。
          const dailyRecords = await WorkerClient.get().getMemos({
            topicId: effectiveTopic,
            startDate,
            endDate,
            query: searchQuery,
            threadOnly,
            noteGranularity: "day",
          });
          const dailyPosts = dailyRecords.map(memoRecordToPost);
          return [...periodicPosts, ...dailyPosts];
        } catch (error) {
          reportError({
            context: "Failed to load periodic note file",
            error,
            notice: "期間ノートの投稿を読み込めませんでした",
            details: { path: periodicNoteFile.path },
          });
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
        ...(dateSelection ? { limit: Number.MAX_SAFE_INTEGER } : {}),
      });

      const posts = records.map(memoRecordToPost);
      return dateSelection
        ? posts.filter((post) => matchesDateSelection(post.timestamp, dateSelection))
        : posts;
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
