import type { MemoRecord, TagStatRecord } from "src/core/db/daystream-db";
import type { Granularity } from "src/core/domain/granularity";
import type { ScannableNote } from "src/core/db/worker-api";

export interface DBServiceOptions {
  appId: string;
}

export interface IDBService {
  /**
   * データベースを初期化し、接続を開始する
   */
  initialize(options: DBServiceOptions): Promise<void>;

  /**
   * 全てのノートをスキャンして再インデックスする
   */
  scanAllNotes(notes: ScannableNote[]): Promise<void>;

  /**
   * 単一のノートをスキャンしてインデックスを更新する
   */
  onFileChanged(note: ScannableNote): Promise<void>;

  /**
   * ファイル削除時のインデックス更新
   */
  onFileDeleted(path: string): Promise<void>;

  /**
   * ファイル名変更時のインデックス更新
   */
  onFileRenamed(note: ScannableNote, oldPath: string): Promise<void>;

  /**
   * 投稿が存在する日付をすべて取得する
   */
  getAllActiveDates(): Promise<string[]>;

  /**
   * 指定した条件でメモを取得する
   */
  getMemos(params: {
    topicId?: string;
    startDate?: string;
    endDate?: string;
    query?: string;
    threadOnly?: boolean;
    limit?: number;
    noteGranularity?: Granularity;
  }): Promise<MemoRecord[]>;

  /**
   * インサイト集計用に、条件に一致する可視メモをすべて取得する
   */
  getAllVisibleMemos(topicId?: string): Promise<MemoRecord[]>;

  /**
   * pinned のメモだけを取得する
   */
  getPinnedMemos(params: {
    topicId?: string;
    query?: string;
    threadOnly?: boolean;
    limit?: number;
    noteGranularity?: Granularity;
  }): Promise<MemoRecord[]>;

  /**
   * 指定した条件のメモ総数を取得する
   */
  countMemos(topicId?: string): Promise<number>;

  /**
   * タグ統計を取得する（タグ名とカウントの配列）
   */
  getTagStats(): Promise<TagStatRecord[]>;

  /**
   * メタ情報を取得する（キーに対応する値）
   */
  getMeta(key: string): Promise<string | undefined>;

  /**
   * 接続を閉じる
   */
  dispose(): Promise<void>;
}
