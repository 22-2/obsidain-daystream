import type { MemoRecord } from "src/core/db/dstr-db";
import { requestUrl } from "obsidian";
import {
  getInsightRecordCacheKey,
  getInsightWordSource,
  type InsightWordTokenMap,
} from "src/features/insights/domain/insightSummary";

export const SUDACHI_ENDPOINT = "http://127.0.0.1:24545/api/sudachi/tokenize";
const TOKEN_CACHE_LIMIT = 20_000;

interface SudachiResponse {
  results: Array<{ words: string[] }>;
}

const tokenCache = new Map<string, string[]>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return isUnknownArray(value) && value.every((item) => typeof item === "string");
}

function isSudachiResponse(value: unknown, expectedLength: number): value is SudachiResponse {
  if (!isRecord(value)) return false;
  const results = value.results;
  return (
    isUnknownArray(results) &&
    results.length === expectedLength &&
    results.every(
      (result) => isRecord(result) && isStringArray(result.words),
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
    // requestUrl は AbortSignal を受けないため、応答後に中止済みなら結果を捨てる。
    const response = await requestUrl({
      url: SUDACHI_ENDPOINT,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        texts: missingRecords.map((record) => getInsightWordSource(record.content)),
      }),
      throw: false,
    });
    if (signal?.aborted || response.status >= 400) return null;

    const payload: unknown = response.json;
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
