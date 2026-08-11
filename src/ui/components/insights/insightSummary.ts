import type { MemoRecord } from "src/db/mfdi-db";

const MONTH_KEYS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const WEEKDAY_COUNT = 7;
const HOUR_COUNT = 24;
const WORD_LIMIT = 120;
const CACHE_LIMIT = 12;

type CountMap = Record<string, number>;

export interface InsightWordCount {
  word: string;
  count: number;
}

export interface InsightMonthStat {
  month: string;
  posts: number;
  averageCharacters: number;
  imageRate: number;
  referenceRate: number;
}

export interface InsightSummary {
  totalPosts: number;
  activeDays: number;
  firstDate: string | null;
  latestDate: string | null;
  longestStreak: number;
  currentStreak: number;
  years: string[];
  dailyCounts: CountMap;
  monthlyCounts: Record<string, CountMap>;
  weekdayHourCounts: number[][];
  weekdayHourCountsByYear: Record<string, number[][]>;
  monthlyStats: Record<string, InsightMonthStat[]>;
  wordCounts: Record<string, CountMap>;
  wordCountsByMonth: Record<string, CountMap>;
  linkDomains: Record<string, CountMap>;
}

interface ParsedInsightRecord {
  date: string;
  year: string;
  month: string;
  hour: number;
  weekday: number;
  characters: number;
  hasImage: boolean;
  hasReference: boolean;
  words: string[];
  domains: string[];
}

const parsedRecordCache = new Map<string, ParsedInsightRecord>();
const summaryCache = new Map<string, InsightSummary>();

function increment(map: CountMap, key: string, amount = 1): void {
  map[key] = (map[key] ?? 0) + amount;
}

function toDateKey(value: string, fallback: string): string | null {
  const candidate = value.slice(0, 10) || fallback.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function normalizeWord(value: string): string | null {
  const normalized = value
    .trim()
    .toLocaleLowerCase()
    .replace(/^[#@]+/, "")
    .replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, "");

  if (!normalized || normalized.length > 80) return null;
  if (/^(?:https?:\/\/|www\.)/i.test(normalized)) return null;
  if (!/[\p{L}\p{N}]/u.test(normalized)) return null;
  return normalized;
}

function tokenize(text: string): string[] {
  const Segmenter = Intl.Segmenter;
  const words: string[] = [];

  if (typeof Segmenter === "function") {
    const segmenter = new Segmenter("ja", { granularity: "word" });
    for (const segment of segmenter.segment(text)) {
      if (!segment.isWordLike) continue;
      const word = normalizeWord(segment.segment);
      if (word) words.push(word);
    }
    return words;
  }

  return text
    .split(/[\s\n\r、。,.!?！？:：;；()[\]{}「」『』]+/u)
    .map(normalizeWord)
    .filter((word): word is string => word !== null);
}

function extractDomains(text: string): string[] {
  const domains: string[] = [];
  const pattern = /(?:https?:\/\/|www\.)[^\s<>()]+/giu;

  for (const match of text.matchAll(pattern)) {
    const raw = match[0].replace(/[.,!?;:'"\]]+$/u, "");
    try {
      const url = new URL(raw.startsWith("www.") ? `https://${raw}` : raw);
      const hostname = url.hostname.toLocaleLowerCase().replace(/^www\./u, "");
      if (hostname) domains.push(hostname);
    } catch {
      // 壊れたURLはリンクドメインの集計対象にしない。
    }
  }

  return domains;
}

function isImageContent(content: string): boolean {
  return /!\[[^\]]*\]\([^)]*\)|!\[\[[^\]]+\]\]|<img\b/iu.test(content);
}

function isPostReference(content: string): boolean {
  return /!?\[\[[^\]]*#\^[^\]]+\]\]/u.test(content);
}

function getWordSource(content: string): string {
  return content
    .replace(/!?\[\[[^\]]+\]\]/gu, " ")
    .replace(/!?(?:\[[^\]]*\])\([^)]*\)/gu, " ")
    .replace(/(?:https?:\/\/|www\.)[^\s<>()]+/giu, " ")
    .replace(/[@#][\p{L}\p{N}._-]+/gu, " ");
}

function getRecordCacheKey(record: MemoRecord): string {
  return `${record.id}:${record.updatedAt}:${record.content.length}`;
}

function getDateParts(record: MemoRecord): {
  date: string;
  year: string;
  month: string;
  hour: number;
  weekday: number;
} | null {
  const created = new Date(record.createdAt);
  const fallback = Number.isNaN(created.valueOf()) ? "" : created.toISOString();
  const date = toDateKey(record.noteDate, fallback);
  if (!date) return null;

  const dateObject = new Date(`${date}T00:00:00`);
  const weekday = Number.isNaN(created.valueOf()) ? dateObject.getDay() : created.getDay();
  const hour = Number.isNaN(created.valueOf()) ? 0 : created.getHours();

  return {
    date,
    year: date.slice(0, 4),
    month: date.slice(0, 7),
    hour,
    weekday,
  };
}

function parseRecord(record: MemoRecord): ParsedInsightRecord | null {
  const dateParts = getDateParts(record);
  if (!dateParts) return null;

  const cacheKey = getRecordCacheKey(record);
  const cached = parsedRecordCache.get(cacheKey);
  if (cached) return cached;

  const parsed: ParsedInsightRecord = {
    ...dateParts,
    characters: Array.from(record.content.trim()).length,
    hasImage: isImageContent(record.content),
    hasReference: isPostReference(record.content),
    words: tokenize(getWordSource(record.content)),
    domains: extractDomains(record.content),
  };

  parsedRecordCache.set(cacheKey, parsed);
  while (parsedRecordCache.size > CACHE_LIMIT * 1000) {
    const firstKey = parsedRecordCache.keys().next().value;
    if (!firstKey) break;
    parsedRecordCache.delete(firstKey);
  }
  return parsed;
}

function incrementWord(map: CountMap, word: string): void {
  increment(map, word);
}

function createWeekdayHourCounts(): number[][] {
  return Array.from({ length: WEEKDAY_COUNT }, () => Array.from({ length: HOUR_COUNT }, () => 0));
}

function calculateStreaks(dailyCounts: CountMap): {
  longestStreak: number;
  currentStreak: number;
} {
  const dates = Object.keys(dailyCounts).sort();
  if (dates.length === 0) return { longestStreak: 0, currentStreak: 0 };

  let longestStreak = 1;
  let running = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(`${dates[index - 1]}T00:00:00`);
    const current = new Date(`${dates[index]}T00:00:00`);
    const days = Math.round((current.valueOf() - previous.valueOf()) / 86_400_000);
    running = days === 1 ? running + 1 : 1;
    longestStreak = Math.max(longestStreak, running);
  }

  running = 1;
  for (let index = dates.length - 1; index > 0; index -= 1) {
    const current = new Date(`${dates[index]}T00:00:00`);
    const previous = new Date(`${dates[index - 1]}T00:00:00`);
    const days = Math.round((current.valueOf() - previous.valueOf()) / 86_400_000);
    if (days !== 1) break;
    running += 1;
  }

  return { longestStreak, currentStreak: running };
}

function buildCacheKey(records: MemoRecord[], activeTag: string | null): string {
  const recordKeys = records
    .map((record) => `${record.id}:${record.updatedAt}:${record.content.length}`)
    .sort();
  let hash = 5381;
  for (const recordKey of recordKeys) {
    for (let index = 0; index < recordKey.length; index += 1) {
      hash = ((hash << 5) + hash + recordKey.charCodeAt(index)) | 0;
    }
  }
  return `${activeTag ?? ""}:${records.length}:${hash}`;
}

export function filterInsightRecords(
  records: MemoRecord[],
  activeTag: string | null,
): MemoRecord[] {
  if (!activeTag) return records;
  return records.filter((record) => record.tags?.includes(activeTag));
}

export function buildInsightSummary(
  inputRecords: MemoRecord[],
  activeTag: string | null = null,
): InsightSummary {
  const records = inputRecords.filter((record) => !record.archived && !record.deleted);
  const cacheKey = buildCacheKey(records, activeTag);
  const cached = summaryCache.get(cacheKey);
  if (cached) return cached;

  const filteredRecords = filterInsightRecords(records, activeTag);
  const dailyCounts: CountMap = {};
  const monthlyCounts: Record<string, CountMap> = {};
  const monthlyStatsByYear = new Map<
    string,
    Map<string, { posts: number; characters: number; images: number; references: number }>
  >();
  const weekdayHourCounts = createWeekdayHourCounts();
  const weekdayHourCountsByYear: Record<string, number[][]> = {};
  const wordCounts: Record<string, CountMap> = {};
  const wordCountsByMonth: Record<string, CountMap> = {};
  const linkDomains: Record<string, CountMap> = {};

  for (const record of filteredRecords) {
    const parsed = parseRecord(record);
    if (!parsed) continue;

    increment(dailyCounts, parsed.date);
    const yearCounts = (monthlyCounts[parsed.year] ??= {});
    increment(yearCounts, parsed.month);
    weekdayHourCounts[parsed.weekday][parsed.hour] += 1;
    const yearWeekdayHourCounts = (weekdayHourCountsByYear[parsed.year] ??=
      createWeekdayHourCounts());
    yearWeekdayHourCounts[parsed.weekday][parsed.hour] += 1;

    const yearMonthly =
      monthlyStatsByYear.get(parsed.year) ??
      new Map<
        string,
        {
          posts: number;
          characters: number;
          images: number;
          references: number;
        }
      >();
    const monthStats = yearMonthly.get(parsed.month) ?? {
      posts: 0,
      characters: 0,
      images: 0,
      references: 0,
    };
    monthStats.posts += 1;
    monthStats.characters += parsed.characters;
    monthStats.images += Number(parsed.hasImage);
    monthStats.references += Number(parsed.hasReference);
    yearMonthly.set(parsed.month, monthStats);
    monthlyStatsByYear.set(parsed.year, yearMonthly);

    const yearWords = (wordCounts[parsed.year] ??= {});
    const monthWords = (wordCountsByMonth[parsed.month] ??= {});
    for (const word of parsed.words) {
      incrementWord(yearWords, word);
      incrementWord(monthWords, word);
    }

    const yearDomains = (linkDomains[parsed.year] ??= {});
    for (const domain of parsed.domains) increment(yearDomains, domain);
  }

  const years = new Set(
    filteredRecords
      .map((record) => record.noteDate.slice(0, 4))
      .filter((year) => /^\d{4}$/.test(year)),
  );
  const sortedYears = [...years].sort().reverse();
  const monthlyStats: Record<string, InsightMonthStat[]> = {};
  for (const year of sortedYears) {
    const stats = monthlyStatsByYear.get(year);
    monthlyStats[year] = MONTH_KEYS.map((month) => {
      const key = `${year}-${month}`;
      const value = stats?.get(key);
      const posts = value?.posts ?? 0;
      return {
        month: key,
        posts,
        averageCharacters: posts ? Math.round((value?.characters ?? 0) / posts) : 0,
        imageRate: posts ? Math.round(((value?.images ?? 0) / posts) * 100) : 0,
        referenceRate: posts ? Math.round(((value?.references ?? 0) / posts) * 100) : 0,
      };
    });
  }

  const sortedDates = Object.keys(dailyCounts).sort();
  const streaks = calculateStreaks(dailyCounts);
  const summary: InsightSummary = {
    totalPosts: filteredRecords.length,
    activeDays: sortedDates.length,
    firstDate: sortedDates[0] ?? null,
    latestDate: sortedDates.at(-1) ?? null,
    ...streaks,
    years: sortedYears,
    dailyCounts,
    monthlyCounts,
    weekdayHourCounts,
    weekdayHourCountsByYear,
    monthlyStats,
    wordCounts,
    wordCountsByMonth,
    linkDomains,
  };

  summaryCache.set(cacheKey, summary);
  while (summaryCache.size > CACHE_LIMIT) {
    const firstKey = summaryCache.keys().next().value;
    if (!firstKey) break;
    summaryCache.delete(firstKey);
  }
  return summary;
}

export function getTopCounts(counts: CountMap | undefined, limit = WORD_LIMIT): InsightWordCount[] {
  if (!counts) return [];
  return Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word))
    .slice(0, limit);
}

export function getWordTrend(
  summary: InsightSummary,
  query: string,
  year = "all",
): InsightWordCount[] {
  const word = normalizeWord(query);
  if (!word) return [];
  return Object.entries(summary.wordCountsByMonth)
    .filter(([month]) => year === "all" || month.startsWith(year))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, counts]) => ({
      word: month,
      count: counts[word] ?? 0,
    }));
}

export function clearInsightCache(): void {
  parsedRecordCache.clear();
  summaryCache.clear();
}

export function getInsightCacheStats(): { parsed: number; summaries: number } {
  return { parsed: parsedRecordCache.size, summaries: summaryCache.size };
}

export { WORD_LIMIT };
