import type { MemoRecord } from "src/db/mfdi-db";

export interface IMemoRepository {
  /**
   * 投稿が存在する日付をすべて取得する
   */
  getAllActiveDates(): Promise<string[]>;

  /**
   * 未アーカイブ・未削除のメモを最新順に取得する
   */
  getLatestVisibleMemos(
    topicId?: string,
    limit?: number,
    query?: string,
    threadOnly?: boolean,
  ): Promise<MemoRecord[]>;

  /**
   * インサイト集計用に、未アーカイブ・未削除のメモをすべて取得する
   */
  getAllVisibleMemos(topicId?: string): Promise<MemoRecord[]>;

  /**
   * pinned のメモだけを取得する
   */
  getPinnedVisibleMemos(params: {
    topicId?: string;
    query?: string;
    threadOnly?: boolean;
    limit?: number;
  }): Promise<MemoRecord[]>;

  /**
   * 未アーカイブ・未削除のメモ総数を取得する
   */
  countVisibleMemos(topicId?: string): Promise<number>;

  /**
   * 指定期間内の未アーカイブ・未削除のメモを取得する
   */
  getVisibleMemosByDateRange(params: {
    topicId?: string;
    startDate: string;
    endDate: string;
    limit?: number;
    query?: string;
    threadOnly?: boolean;
  }): Promise<MemoRecord[]>;

  /**
   * 指定したパスのメモを削除する
   */
  deleteByPath(path: string): Promise<void>;

  /**
   * メモを一括保存する
   */
  bulkPut(records: MemoRecord[]): Promise<void>;

  /**
   * 全てのメモを削除する
   */
  clear(): Promise<void>;

  /**
   * 指定したパスのメモを取得する
   */
  findByPath(path: string): Promise<MemoRecord[]>;
}
