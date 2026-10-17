import type React from "react";
// 意図: Insightsの画面を機能単位で隣接させ、集計処理との関係を追いやすくする。
import { useEffect, useMemo, useState } from "react";
import { setTooltip } from "obsidian";
import {
  getTopCounts,
  getWordTrend,
  type InsightMonthStat,
  type InsightSummary,
} from "src/features/insights/domain/insightSummary";
import { Button, Spinner } from "src/core/ui/components/primitives";
import { useInsights } from "src/features/insights/hooks/useInsights";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { useShallow } from "zustand/shallow";

type InsightTab = "overview" | "words";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatDate(value: string | null): string {
  return value ?? "—";
}

function getYearCounts(summary: InsightSummary, year: string): Record<string, number> {
  if (year !== "all") return summary.wordCounts[year] ?? {};
  const counts: Record<string, number> = {};
  for (const yearCounts of Object.values(summary.wordCounts)) {
    for (const [word, count] of Object.entries(yearCounts)) {
      counts[word] = (counts[word] ?? 0) + count;
    }
  }
  return counts;
}

function getDomainCounts(summary: InsightSummary, year: string): Record<string, number> {
  if (year !== "all") return summary.linkDomains[year] ?? {};
  const counts: Record<string, number> = {};
  for (const yearCounts of Object.values(summary.linkDomains)) {
    for (const [domain, count] of Object.entries(yearCounts)) {
      counts[domain] = (counts[domain] ?? 0) + count;
    }
  }
  return counts;
}

function getDailyCounts(summary: InsightSummary, year: string): Record<string, number> {
  if (year === "all") return summary.dailyCounts;
  return Object.fromEntries(
    Object.entries(summary.dailyCounts).filter(([date]) => date.startsWith(year)),
  );
}

function getWeekdayHourCounts(summary: InsightSummary, year: string): number[][] {
  return year === "all"
    ? summary.weekdayHourCounts
    : (summary.weekdayHourCountsByYear[year] ??
        Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)));
}

function YearTabs({
  summary,
  value,
  onChange,
}: {
  summary: InsightSummary;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="dstr-insight-years" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={value === "all"}
        className={value === "all" ? "is-active" : undefined}
        onClick={() => onChange("all")}
      >
        すべて
      </button>
      {summary.years.map((year) => (
        <button
          key={year}
          type="button"
          role="tab"
          aria-selected={value === year}
          className={value === year ? "is-active" : undefined}
          onClick={() => onChange(year)}
        >
          {year}
        </button>
      ))}
    </div>
  );
}

function InsightCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`dstr-insight-card ${className ?? ""}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="dstr-insight-stat">
      <span>{label}</span>
      <strong>{typeof value === "number" ? formatNumber(value) : value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function AnnualActivity({
  summary,
  year,
  onYearChange,
}: {
  summary: InsightSummary;
  year: string;
  onYearChange: (year: string) => void;
}) {
  const displayYear = year === "all" ? summary.years[0] : year;
  const counts = getDailyCounts(summary, displayYear ?? "all");
  const yearNumber = Number(displayYear);
  const cellCount = displayYear ? (new Date(yearNumber, 1, 29).getDate() === 29 ? 366 : 365) : 0;
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Number(displayYear), 0, index + 1);
    const key = `${displayYear}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { key, count: counts[key] ?? 0 };
  });
  const max = Math.max(1, ...cells.map((cell) => cell.count));

  return (
    <InsightCard title="年間アクティビティ" className="dstr-insight-card--activity">
      <div className="dstr-insight-card__meta">
        <strong>{displayYear ?? "—"}</strong>
        <YearTabs summary={summary} value={year} onChange={onYearChange} />
      </div>
      <div
        className="dstr-activity-grid"
        ref={(element) => {
          if (element) setTooltip(element, `${displayYear ?? ""}年の活動量`);
        }}
      >
        {cells.map((cell) => (
          <span
            key={cell.key}
            ref={(element) => {
              if (element) setTooltip(element, `${cell.key}: ${cell.count}件`);
            }}
            style={{
              opacity: cell.count ? 0.35 + (cell.count / max) * 0.65 : 0.12,
            }}
          />
        ))}
      </div>
      <small className="dstr-insight-muted">{displayYear ? `${displayYear}-01-01` : "—"}</small>
    </InsightCard>
  );
}

function WeekdayHourHeatmap({ summary, year }: { summary: InsightSummary; year: string }) {
  const counts = getWeekdayHourCounts(summary, year);
  const max = Math.max(1, ...counts.flat());

  return (
    <InsightCard title="時間帯×曜日">
      <div
        className="dstr-time-heatmap"
        ref={(element) => {
          if (element) setTooltip(element, "時間帯と曜日ごとの投稿数");
        }}
      >
        <div className="dstr-time-heatmap__axis" />
        {Array.from({ length: 24 }, (_, hour) => (
          <span key={hour} className="dstr-time-heatmap__hour">
            {hour % 6 === 0 ? hour : ""}
          </span>
        ))}
        {WEEKDAYS.map((weekday, dayIndex) => (
          <FragmentRow key={weekday} label={weekday} values={counts[dayIndex]} max={max} />
        ))}
      </div>
    </InsightCard>
  );
}

function FragmentRow({ label, values, max }: { label: string; values: number[]; max: number }) {
  return (
    <>
      <span className="dstr-time-heatmap__day">{label}</span>
      {Array.from({ length: 24 }, (_, hour) => {
        const count = values?.[hour] ?? 0;
        return (
          <span
            key={`${label}-${hour}`}
            ref={(element) => {
              if (element) setTooltip(element, `${label} ${hour}時: ${count}件`);
            }}
            style={{ opacity: count ? 0.25 + (count / max) * 0.75 : 0.1 }}
          />
        );
      })}
    </>
  );
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="dstr-mini-bars" aria-hidden="true">
      {values.map((value, index) => (
        <span key={index} style={{ height: `${value ? Math.max(8, (value / max) * 100) : 2}%` }} />
      ))}
    </div>
  );
}

function MonthlyTrends({ stats }: { stats: InsightMonthStat[] }) {
  const posts = stats.map((item) => item.posts);
  const averageCharacters = stats.map((item) => item.averageCharacters);
  const imageRates = stats.map((item) => item.imageRate);
  const referenceRates = stats.map((item) => item.referenceRate);
  return (
    <InsightCard title="スタイルの推移（月次）" className="dstr-insight-card--trends">
      <div className="dstr-insight-trend-grid">
        <Trend title="投稿数" values={posts} suffix="件" />
        <Trend title="平均文字数" values={averageCharacters} suffix="字" />
        <Trend title="画像率" values={imageRates} suffix="%" />
        <Trend title="投稿参照率" values={referenceRates} suffix="%" />
      </div>
    </InsightCard>
  );
}

function Trend({ title, values, suffix }: { title: string; values: number[]; suffix: string }) {
  const latest = values.at(-1) ?? 0;
  return (
    <div className="dstr-insight-trend">
      <div className="dstr-insight-trend__header">
        <span>{title}</span>
        <strong>
          {formatNumber(latest)}
          {suffix}
        </strong>
      </div>
      <MiniBars values={values} />
    </div>
  );
}

function Overview({
  summary,
  year,
  onYearChange,
}: {
  summary: InsightSummary;
  year: string;
  onYearChange: (year: string) => void;
}) {
  const selectedStats = summary.monthlyStats[year === "all" ? summary.years[0] : year] ?? [];
  return (
    <div className="dstr-insight-sections">
      <InsightCard title="記録">
        <div className="dstr-insight-stats">
          <Stat label="最長連続投稿日数" value={`${summary.longestStreak} 日`} />
          <Stat label="現在の連続投稿日数" value={`${summary.currentStreak} 日`} />
          <Stat label="最初の投稿日" value={formatDate(summary.firstDate)} />
          <Stat label="最新の投稿日" value={formatDate(summary.latestDate)} />
          <Stat label="累計投稿" value={summary.totalPosts} />
          <Stat label="投稿した日数" value={`${summary.activeDays} 日`} />
        </div>
      </InsightCard>
      <AnnualActivity summary={summary} year={year} onYearChange={onYearChange} />
      <WeekdayHourHeatmap summary={summary} year={year} />
      <MonthlyTrends stats={selectedStats} />
    </div>
  );
}

function Words({ summary, year }: { summary: InsightSummary; year: string }) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const trend = getWordTrend(summary, query, year);
  const words = getTopCounts(getYearCounts(summary, year));
  const domains = getTopCounts(getDomainCounts(summary, year), 15);
  const maxWord = Math.max(1, ...words.map((item) => item.count));

  return (
    <div className="dstr-insight-sections">
      <InsightCard title="語トレンド">
        <form
          className="dstr-word-search"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder="語を入力すると月別の使用回数を表示"
          />
          <Button type="submit" variant="accent" size="sm">
            表示
          </Button>
        </form>
        {query ? (
          <div className="dstr-word-trend">
            {trend.map((item) => (
              <div
                key={item.word}
                ref={(element) => {
                  if (element) setTooltip(element, `${item.word}: ${item.count}回`);
                }}
              >
                <span
                  style={{
                    height: `${item.count ? Math.max(6, (item.count / Math.max(1, ...trend.map((value) => value.count))) * 100) : 2}%`,
                  }}
                />
                <small>{item.word.slice(5)}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="dstr-insight-muted">語を入力して「表示」を押してください。</p>
        )}
      </InsightCard>

      <InsightCard title="頻出語" className="dstr-insight-card--words">
        <div className="dstr-insight-card__meta">
          <span>{year === "all" ? "すべて" : year}</span>
          <span>{formatNumber(words.length)}語</span>
        </div>
        <div className="dstr-word-list">
          {words.map((item, index) => (
            <div key={item.word} className="dstr-word-list__item">
              <span className="dstr-word-list__rank">{index + 1}</span>
              <strong>{item.word}</strong>
              <span
                className="dstr-word-list__bar"
                style={{
                  width: `${Math.max(3, (item.count / maxWord) * 100)}%`,
                }}
              />
              <small>{formatNumber(item.count)}</small>
            </div>
          ))}
        </div>
      </InsightCard>

      <InsightCard title="リンクドメイン" className="dstr-insight-card--compact">
        <div className="dstr-insight-ranking">
          {domains.map((item) => (
            <div key={item.word}>
              <span>{item.word}</span>
              <strong>{formatNumber(item.count)}</strong>
            </div>
          ))}
        </div>
      </InsightCard>
    </div>
  );
}

export const InsightView: React.FC = () => {
  const { summary, loading, error } = useInsights();
  const activeTag = useSettingsStore(useShallow((state) => state.activeTag));
  const [tab, setTab] = useState<InsightTab>("overview");
  const [year, setYear] = useState("all");

  useEffect(() => {
    if (summary && year !== "all" && !summary.years.includes(year)) setYear("all");
  }, [summary, year]);

  const selectedLabel = useMemo(
    () => (activeTag ? `タグ: ${activeTag}` : "すべてのタグ"),
    [activeTag],
  );

  return (
    <div className="dstr-insight-view">
      <header className="dstr-insight-header">
        <div>
          <h1>インサイト</h1>
          <small>{selectedLabel}</small>
        </div>
        <div className="dstr-insight-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "overview"}
            className={tab === "overview" ? "is-active" : undefined}
            onClick={() => setTab("overview")}
          >
            概要
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "words"}
            className={tab === "words" ? "is-active" : undefined}
            onClick={() => setTab("words")}
          >
            言葉
          </button>
        </div>
      </header>

      {loading && !summary ? (
        <div className="dstr-insight-loading">
          <Spinner className="size-6" />
          集計中…
        </div>
      ) : error ? (
        <div className="dstr-insight-empty">インサイトを読み込めませんでした。</div>
      ) : summary && summary.totalPosts > 0 ? (
        <>
          <div className="dstr-insight-filter-row">
            <YearTabs summary={summary} value={year} onChange={setYear} />
          </div>
          {tab === "overview" ? (
            <Overview summary={summary} year={year} onYearChange={setYear} />
          ) : (
            <Words summary={summary} year={year} />
          )}
        </>
      ) : (
        <div className="dstr-insight-empty">まだ集計できる投稿がありません。</div>
      )}
    </div>
  );
};
