import type { ITagStatsRepository } from "src/core/db/interfaces/ITagStatsRepository";
import type { MemoRecord, DaystreamDatabase } from "src/core/db/daystream-db";

export class DexieTagStatsRepository implements ITagStatsRepository {
  constructor(private readonly db: DaystreamDatabase) {}

  /** Full rebuild from the current memos table. */
  async rebuild(): Promise<void> {
    const counts = new Map<string, number>();

    for (const memo of await this.db.memos.toArray()) {
      if (memo.archived || memo.deleted) continue;
      for (const tag of memo.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    const updatedAt = new Date().toISOString();
    await this.db.tagStats.clear();
    if (counts.size > 0) {
      await this.db.tagStats.bulkPut(
        [...counts.entries()].map(([tag, count]) => ({
          tag,
          count,
          updatedAt,
        })),
      );
    }
  }

  /** Apply a diff: subtract `removed` counts, add `added` counts. */
  async applyDeltas(removed: Map<string, number>, added: Map<string, number>): Promise<void> {
    const tags = [...new Set([...removed.keys(), ...added.keys()])];
    if (tags.length === 0) return;

    const existingRows = await this.db.tagStats.bulkGet(tags);
    const updatedAt = new Date().toISOString();

    const toPut: { tag: string; count: number; updatedAt: string }[] = [];
    const toDelete: string[] = [];

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const existingCount = existingRows[i]?.count ?? 0;
      const newCount = existingCount - (removed.get(tag) ?? 0) + (added.get(tag) ?? 0);

      if (newCount > 0) {
        toPut.push({ tag, count: newCount, updatedAt });
      } else if (existingCount > 0) {
        toDelete.push(tag);
      }
    }

    await Promise.all([
      toPut.length ? this.db.tagStats.bulkPut(toPut) : undefined,
      toDelete.length ? this.db.tagStats.bulkDelete(toDelete) : undefined,
    ]);
  }

  /** Collect tag counts from the memos currently stored at `path`. */
  async collectForPath(path: string): Promise<Map<string, number>> {
    const memos = await this.db.memos.where("path").equals(path).toArray();
    return this.collectFromRecords(memos);
  }

  /** Collect tag counts from an in-memory record array. */
  collectFromRecords(records: MemoRecord[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const r of records ?? []) {
      if (r.archived || r.deleted) continue;
      for (const tag of r.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return counts;
  }

  async clear(): Promise<void> {
    await this.db.tagStats.clear();
  }
}
