import type { IMemoRepository } from "src/db/interfaces/IMemoRepository";
import type { MemoRecord, MFDIDatabase } from "src/db/mfdi-db";
import type { Granularity } from "src/ui/types";

export class DexieMemoRepository implements IMemoRepository {
  constructor(private readonly db: MFDIDatabase) {}

  async getAllActiveDates(): Promise<string[]> {
    return await this.db.getAllActiveDates();
  }

  async getLatestVisibleMemos(
    topicId?: string,
    limit = 300,
    query?: string,
    threadOnly?: boolean,
    noteGranularity?: Granularity,
  ): Promise<MemoRecord[]> {
    return await this.db.getLatestVisibleMemos(topicId, limit, query, threadOnly, noteGranularity);
  }

  async getAllVisibleMemos(topicId?: string): Promise<MemoRecord[]> {
    return await this.db.getAllVisibleMemos(topicId);
  }

  async getPinnedVisibleMemos(params: {
    topicId?: string;
    query?: string;
    threadOnly?: boolean;
    limit?: number;
    noteGranularity?: Granularity;
  }): Promise<MemoRecord[]> {
    return await this.db.getPinnedVisibleMemos(params);
  }

  async countVisibleMemos(topicId?: string): Promise<number> {
    return await this.db.countVisibleMemos(topicId);
  }

  async getVisibleMemosByDateRange(params: {
    topicId?: string;
    startDate: string;
    endDate: string;
    limit?: number;
    query?: string;
    threadOnly?: boolean;
    noteGranularity?: Granularity;
  }): Promise<MemoRecord[]> {
    return await this.db.getVisibleMemosByDateRange(params);
  }

  async deleteByPath(path: string): Promise<void> {
    await this.db.memos.where("path").equals(path).delete();
  }

  async bulkPut(records: MemoRecord[]): Promise<void> {
    if (records.length > 0) {
      await this.db.memos.bulkPut(records);
    }
  }

  async clear(): Promise<void> {
    await this.db.memos.clear();
  }

  async findByPath(path: string): Promise<MemoRecord[]> {
    return await this.db.memos.where("path").equals(path).toArray();
  }
}
