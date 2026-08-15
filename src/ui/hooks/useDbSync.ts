import { useEffect } from "react";
import { clearInsightCache } from "src/ui/components/insights/insightSummary";
import { clearSudachiCache } from "src/ui/components/insights/sudachi";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { refreshAllPosts } from "src/ui/utils/swr-utils";
import { useShallow } from "zustand/shallow";

/**
 * BroadcastChannel を通じてデータベースの更新通知を受け取り、
 * SWR のキャッシュを無効化するフック。
 */
export function useDbSync() {
  const { activeTopic, displayMode, timelineDayKey, searchQuery, threadOnly } = useSettingsStore(
    useShallow((s) => ({
      activeTopic: s.activeTopic,
      displayMode: s.displayMode,
      timelineDayKey: s.date.format("YYYY-MM-DD"),
      searchQuery: s.searchQuery,
      threadOnly: s.threadOnly,
    })),
  );

  useEffect(() => {
    const channel = new BroadcastChannel("mfdi-db-updates");

    channel.onmessage = (event) => {
      if (event.data.type === "mfdi-db-updated") {
        clearInsightCache();
        clearSudachiCache();
        void refreshAllPosts({
          activeTopic,
          displayMode,
          timelineDayKey,
          searchQuery,
          threadOnly,
        });
      }
    };

    // 初期マウント時に一度明示的に再検証を行う。
    // 意図: ワーカー側のフルスキャンや更新通知が
    // React の BroadcastChannel リスナ登録より先に発生すると、通知を取りこぼす。
    // マウント時に mutate を投げておくことで、初回インデックスの結果を確実に反映させる。
    // （副作用は最小で、既に最新ならフェッチは短時間で終わる）
    void refreshAllPosts({
      activeTopic,
      displayMode,
      timelineDayKey,
      searchQuery,
      threadOnly,
    });

    return () => {
      channel.close();
    };
  }, [activeTopic, displayMode, timelineDayKey, searchQuery, threadOnly]);
}
