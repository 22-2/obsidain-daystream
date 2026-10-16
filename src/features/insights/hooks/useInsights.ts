// 意図: Insights固有の取得と集計フローを専用hookとしてfeature内にまとめる。
import { useEffect, useMemo, useState } from "react";
import type { MemoRecord } from "src/core/db/dstr-db";
import { subscribeToDBUpdates } from "src/core/db/updates";
import {
  buildInsightSummary,
  clearInsightCache,
  type InsightWordTokenMap,
  type InsightSummary,
} from "src/features/insights/domain/insightSummary";
import { clearSudachiCache, tokenizeInsightRecords } from "src/features/insights/domain/sudachi";
import { useDSTRDB } from "src/core/db/hooks/useDSTRDB";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { useShallow } from "zustand/shallow";

interface UseInsightsResult {
  summary: InsightSummary | null;
  loading: boolean;
  error: Error | null;
}

export function useInsights(): UseInsightsResult {
  const db = useDSTRDB();
  const { activeTopic, activeTag } = useSettingsStore(
    useShallow((state) => ({
      activeTopic: state.activeTopic,
      activeTag: state.activeTag,
    })),
  );
  const [records, setRecords] = useState<MemoRecord[] | null>(null);
  const [wordTokens, setWordTokens] = useState<InsightWordTokenMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;
    const controller = new AbortController();

    const fetchRecords = async () => {
      const currentRequest = ++requestId;
      setLoading(true);
      setError(null);
      try {
        const nextRecords = await db.getAllVisibleMemos(activeTopic || undefined);
        if (!mounted || currentRequest !== requestId) return;
        setRecords(nextRecords);
        setWordTokens(null);

        const nextWordTokens = await tokenizeInsightRecords(nextRecords, controller.signal);
        if (!mounted || currentRequest !== requestId) return;
        setWordTokens(nextWordTokens);
      } catch (cause) {
        if (!mounted || currentRequest !== requestId) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setRecords(null);
      } finally {
        if (mounted && currentRequest === requestId) setLoading(false);
      }
    };

    void fetchRecords();

    const unsubscribe = subscribeToDBUpdates(() => {
      clearInsightCache();
      clearSudachiCache();
      void fetchRecords();
    });

    return () => {
      mounted = false;
      requestId += 1;
      controller.abort();
      unsubscribe();
    };
  }, [activeTopic, db]);

  const summary = useMemo(
    () => (records ? buildInsightSummary(records, activeTag, wordTokens) : null),
    [records, activeTag, wordTokens],
  );

  return { summary, loading, error };
}
