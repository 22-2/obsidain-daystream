import { useEffect, useMemo, useState } from "react";
import type { MemoRecord } from "src/db/mfdi-db";
import {
  buildInsightSummary,
  clearInsightCache,
  type InsightSummary,
} from "src/ui/components/insights/insightSummary";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    const fetchRecords = async () => {
      const currentRequest = ++requestId;
      setLoading(true);
      setError(null);
      try {
        const nextRecords = await db.getAllVisibleMemos(activeTopic || undefined);
        if (!mounted || currentRequest !== requestId) return;
        setRecords(nextRecords);
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
      };
    }

    const channel = new BroadcastChannel("mfdi-db-updates");
    channel.onmessage = (event) => {
      if (event?.data?.type !== "mfdi-db-updated") return;
      clearInsightCache();
      void fetchRecords();
    };

    return () => {
      mounted = false;
      requestId += 1;
      channel.close();
    };
  }, [activeTopic, db]);

  const summary = useMemo(
    () => (records ? buildInsightSummary(records, activeTag) : null),
    [records, activeTag],
  );

  return { summary, loading, error };
}
