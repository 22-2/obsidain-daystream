import { useEffect, useMemo, useState } from "react";
import type { MemoRecord } from "src/db/mfdi-db";
import {
  buildInsightSummary,
  clearInsightCache,
  type InsightWordTokenMap,
  type InsightSummary,
} from "src/ui/components/insights/insightSummary";
import { clearSudachiCache, tokenizeInsightRecords } from "src/ui/components/insights/sudachi";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

interface UseInsightsResult {
  summary: InsightSummary | null;
  loading: boolean;
  error: Error | null;
}

export function useInsights(): UseInsightsResult {
  const db = useMFDIDB();
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

    if (typeof BroadcastChannel === "undefined") {
      return () => {
        mounted = false;
        controller.abort();
      };
    }

    const channel = new BroadcastChannel("mfdi-db-updates");
    channel.onmessage = (event) => {
      if (event?.data?.type !== "mfdi-db-updated") return;
      clearInsightCache();
      clearSudachiCache();
      void fetchRecords();
    };

    return () => {
      mounted = false;
      requestId += 1;
      controller.abort();
      channel.close();
    };
  }, [activeTopic, db]);

  const summary = useMemo(
    () => (records ? buildInsightSummary(records, activeTag, wordTokens) : null),
    [records, activeTag, wordTokens],
  );

  return { summary, loading, error };
}
