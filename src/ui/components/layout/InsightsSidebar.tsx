import { useEffect, useMemo, useState } from "react";
import { SidebarSectionHeader } from "src/ui/components/layout/SidebarPrimitives";
import {
  buildActivitySummary,
  type ActivitySummary,
} from "src/ui/components/layout/activitySummary";
import { HStack, Spinner, Text, VStack } from "src/ui/components/primitives";
import { useMFDIDB } from "src/ui/hooks/useMFDIDB";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

const ACTIVITY_BAR_COUNT = 32;
const ACTIVITY_FETCH_LIMIT = 10_000;

function formatDate(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 7);
}

function buildActivityBars(summary: ActivitySummary | null) {
  if (!summary || !summary.firstDate || !summary.latestDate) {
    return Array.from({ length: ACTIVITY_BAR_COUNT }, () => 0);
  }

  const start = Date.parse(`${summary.firstDate}T00:00:00Z`);
  const end = Date.parse(`${summary.latestDate}T00:00:00Z`);
  const spanDays = Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
  const bucketSize = Math.max(1, Math.ceil(spanDays / ACTIVITY_BAR_COUNT));
  const bars = Array.from({ length: ACTIVITY_BAR_COUNT }, () => 0);

  for (const [date, count] of Object.entries(summary.dailyCounts)) {
    const timestamp = Date.parse(`${date}T00:00:00Z`);
    const index = Math.min(
      ACTIVITY_BAR_COUNT - 1,
      Math.max(0, Math.floor((timestamp - start) / 86_400_000 / bucketSize)),
    );
    bars[index] += count;
  }

  return bars;
}

export const InsightsSidebar: React.FC = () => {
  const db = useMFDIDB();
  const { activeTag, activeTopic } = useSettingsStore(
    useShallow((state) => ({
      activeTag: state.activeTag,
      activeTopic: state.activeTopic,
    })),
  );
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchSummary = async () => {
      setLoading(true);
      try {
        const [records, tagStats] = await Promise.all([
          db.getMemos({
            ...(activeTopic ? { topicId: activeTopic } : {}),
            limit: ACTIVITY_FETCH_LIMIT,
          }),
          db.getTagStats(),
        ]);
        if (!mounted) return;
        setSummary(buildActivitySummary(records, activeTag, tagStats.length));
      } catch (error) {
        console.error("Failed to fetch activity summary:", error);
        if (mounted) setSummary(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchSummary();
    const channel = new BroadcastChannel("mfdi-db-updates");
    channel.onmessage = (event) => {
      if (event?.data?.type === "mfdi-db-updated") void fetchSummary();
    };

    return () => {
      mounted = false;
      channel.close();
    };
  }, [activeTag, activeTopic, db]);

  const bars = useMemo(() => buildActivityBars(summary), [summary]);
  const maxBar = Math.max(1, ...bars);

  return (
    <VStack className="h-full w-full items-stretch gap-0 overflow-y-auto">
      <VStack className="items-stretch gap-2 p-3">
        <SidebarSectionHeader className="px-0">
          アクティビティ
        </SidebarSectionHeader>
        <div
          className="mfdi-activity-chart flex h-[92px] items-end gap-[2px] rounded-[var(--radius-s)] border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-2 py-2"
          aria-label="投稿アクティビティ"
        >
          {bars.map((count, index) => (
            <div
              key={index}
              className="mfdi-activity-chart__bar min-w-0 flex-1 rounded-t-[2px] bg-[var(--color-accent)] transition-[height] duration-200"
              style={{
                height: `${count === 0 ? 3 : Math.max(8, (count / maxBar) * 100)}%`,
              }}
              title={`${count}件`}
            />
          ))}
        </div>
        <HStack className="justify-between text-[length:var(--font-ui-smaller)] text-[var(--text-muted)]">
          <Text>
            {loading ? "読み込み中…" : formatDate(summary?.firstDate ?? null)}
          </Text>
          <Text>{formatDate(summary?.latestDate ?? null)}</Text>
        </HStack>
      </VStack>

      <div className="border-t border-[var(--background-modifier-border)]" />

      <VStack className="items-stretch gap-2 p-3">
        <SidebarSectionHeader className="px-0">統計</SidebarSectionHeader>
        <VStack className="items-stretch gap-1 text-[length:var(--font-ui-small)]">
          <StatRow
            label="投稿"
            value={summary?.totalPosts ?? 0}
            loading={loading}
          />
          <StatRow
            label="投稿のある日"
            value={summary?.activeDays ?? 0}
            loading={loading}
          />
          <StatRow
            label="タグ"
            value={summary?.tagCount ?? 0}
            loading={loading}
          />
          <StatRow
            label="開始日"
            value={summary?.firstDate ?? "—"}
            loading={loading}
          />
        </VStack>
      </VStack>
    </VStack>
  );
};

const StatRow: React.FC<{
  label: string;
  value: string | number;
  loading: boolean;
}> = ({ label, value, loading }) => (
  <HStack className="justify-between gap-2">
    <Text className="text-[var(--text-muted)]">{label}</Text>
    {loading ? (
      <Spinner className="size-3 text-[var(--text-faint)] [animation-duration:0.8s]" />
    ) : (
      <Text className="font-medium tabular-nums">{value}</Text>
    )}
  </HStack>
);
