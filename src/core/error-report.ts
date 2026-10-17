import { Notice } from "obsidian";
import { createLogger } from "src/core/logger";

export interface ErrorReport {
  at: string;
  context: string;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
}

export interface ReportErrorParams {
  /** 開発者向け: 何をしていて失敗したか。ログとデバッグ情報に残す。 */
  context: string;
  error: unknown;
  /** 利用者向け: 通知に出す文。省略時はログと記録だけ行う。 */
  notice?: string;
  /** 原因調査に必要な付帯情報（対象パスなど）。 */
  details?: Record<string, unknown>;
}

// 意図: 不具合報告に添えられるよう直近のエラーだけを保持する。
// 永続化しないのは、ノート内容を含み得るエラーを端末に残さないため。
const MAX_REPORTS = 20;
// 意図: Worker 障害などで同じ失敗が連続しても、通知が画面を埋めないようにする。
const NOTICE_DEDUPE_MS = 10_000;
const NOTICE_DURATION_MS = 8_000;

const logger = createLogger("error");
const recentReports: ErrorReport[] = [];
const lastNoticeAt = new Map<string, number>();

function toErrorReport(params: ReportErrorParams): ErrorReport {
  const { error } = params;
  return {
    at: new Date().toISOString(),
    context: params.context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    details: params.details,
  };
}

function isNoticeRecentlyShown(notice: string, now: number): boolean {
  const last = lastNoticeAt.get(notice);
  return last !== undefined && now - last < NOTICE_DEDUPE_MS;
}

function showErrorNotice(notice: string, report: ErrorReport): void {
  const now = Date.now();
  if (isNoticeRecentlyShown(notice, now)) return;
  lastNoticeAt.set(notice, now);

  new Notice(
    `Daystream: ${notice}\n原因: ${report.message}\n` +
      "コマンド「不具合報告用の情報をコピー」で詳細を取得できます",
    NOTICE_DURATION_MS,
  );
}

/** 失敗をログに残し、診断用に記録する。notice があれば利用者にも通知する。 */
export function reportError(params: ReportErrorParams): void {
  const report = toErrorReport(params);
  recentReports.push(report);
  if (recentReports.length > MAX_REPORTS) recentReports.shift();

  logger.error(`${params.context}:`, params.error, ...(params.details ? [params.details] : []));
  if (params.notice) showErrorNotice(params.notice, report);
}

export function getRecentErrorReports(): readonly ErrorReport[] {
  return [...recentReports];
}

/** テスト用: 記録と通知の抑制状態を初期化する。 */
export function resetErrorReportsForTesting(): void {
  recentReports.length = 0;
  lastNoticeAt.clear();
}
