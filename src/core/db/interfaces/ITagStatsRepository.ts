import type { MemoRecord } from "src/core/db/daystream-db";

export interface ITagStatsRepository {
  /**
   * 現在のメモテーブルから統計情報を再構築する
   */
  rebuild(): Promise<void>;

  /**
   * タグ統計の差分を適用する
   * @param removed 削除されたタグのカウント
   * @param added 追加されたタグのカウント
   */
  applyDeltas(removed: Map<string, number>, added: Map<string, number>): Promise<void>;

  /**
   * 指定したパスの現在のタグカウントを収集する
   */
  collectForPath(path: string): Promise<Map<string, number>>;

  /**
   * メモレコード配列からタグカウントを収集する
   */
  collectFromRecords(records: MemoRecord[]): Map<string, number>;

  /**
   * 全ての統計情報を削除する
   */
  clear(): Promise<void>;
}
