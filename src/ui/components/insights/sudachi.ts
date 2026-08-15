import type { MemoRecord } from "src/db/mfdi-db";
import {
  getInsightRecordCacheKey,
  getInsightWordSource,
  type InsightWordTokenMap,
} from "src/ui/components/insights/insightSummary";

export const SUDACHI_ENDPOINT = "http://127.0.0.1:24545/api/sudachi/tokenize";
const TOKEN_CACHE_LIMIT = 20_000;

interface SudachiResponse {
  results: Array<{ words: string[] }>;
}

const tokenCache = new Map<string, string[]>();

function isSudachiResponse(value: unknown, expectedLength: number): value is SudachiResponse {
  if (!value || typeof value !== "object" || !("results" in value)) return false;
  const results = (value as { results?: unknown }).results;
  return (
    Array.isArray(results) &&
    results.length === expectedLength &&
    results.every(
      (result) =>
        !!result &&
        typeof result === "object" &&
        "words" in result &&
        Array.isArray((result as { words?: unknown }).words) &&
        (result as { words: unknown[] }).words.every((word) => typeof word === "string"),
    )
  );
}

/**
 * lib-server が利用できるときだけ SudachiPy を起動して、投稿ごとの内容語を取得する。
 * サーバー未起動・モバイル環境では null を返し、呼び出し側が簡易分割へフォールバックする。
 */
export async function tokenizeInsightRecords(
  records: MemoRecord[],
  signal?: AbortSignal,
): Promise<ReadonlyMap<string, string[]> | null> {
  if (records.length === 0) return new Map();

  const result = new Map<string, string[]>();
  const missingRecords: MemoRecord[] = [];
  for (const record of records) {
    const key = getInsightRecordCacheKey(record);
    const cached = tokenCache.get(key);
    if (cached) {
      tokenCache.delete(key);
      tokenCache.set(key, cached);
      result.set(key, cached);
    } else {
      missingRecords.push(record);
    }
  }
  if (missingRecords.length === 0) return result;

  try {
    const response = await fetch(SUDACHI_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        texts: missingRecords.map((record) => getInsightWordSource(record.content)),
      }),
      signal,
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!isSudachiResponse(payload, missingRecords.length)) return null;

    payload.results.forEach((item, index) => {
      const key = getInsightRecordCacheKey(missingRecords[index]);
      tokenCache.set(key, item.words);
      result.set(key, item.words);
    });
    while (tokenCache.size > TOKEN_CACHE_LIMIT) {
      const firstKey = tokenCache.keys().next().value;
      if (!firstKey) break;
      tokenCache.delete(firstKey);
    }
    return result satisfies InsightWordTokenMap;
  } catch {
    return null;
  }
}

export function clearSudachiCache(): void {
  tokenCache.clear();
}
