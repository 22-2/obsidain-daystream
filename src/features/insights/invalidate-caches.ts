import { clearInsightCache } from "src/features/insights/domain/insightSummary";
import { clearSudachiCache } from "src/features/insights/domain/sudachi";

// 意図: DB更新後にInsightsの派生キャッシュをまとめて破棄し、集計元との不一致を防ぐ。
export function invalidateInsightsCaches(): void {
  clearInsightCache();
  clearSudachiCache();
}
