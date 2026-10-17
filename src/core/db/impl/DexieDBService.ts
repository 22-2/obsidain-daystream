import { DexieMemoRepository } from "src/core/db/impl/DexieMemoRepository";
import { DexieTagStatsRepository } from "src/core/db/impl/DexieTagStatsRepository";
import type { DBServiceOptions, IDBService } from "src/core/db/interfaces/IDBService";
import { DSTRDatabase, type MemoRecord, type TagStatRecord } from "src/core/db/dstr-db";
import { buildMemoRecordsForNote } from "src/core/db/scan-note";
import type { ScannableNote } from "src/core/db/worker-api";
import type { Granularity } from "src/core/domain/granularity";
import { DB_UPDATE_CHANNEL_NAME, DB_UPDATED_MESSAGE_TYPE } from "src/core/db/updates";
import { toError } from "src/core/errors";

// 意図: 同一内容の再インデックスをスキップする判定用の軽量ハッシュ（djb2）。
// 衝突耐性より速度を優先する。長さも併記して衝突リスクをさらに下げる。
function hashScannableNote(note: ScannableNote): string {
  const source = `${note.topicId}\0${note.noteGranularity}\0${note.noteDate}\0${note.noteName}\0${note.content}`;
  let hash = 5381;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) + hash + source.charCodeAt(i)) | 0;
  }
  return `${hash}:${source.length}`;
}

export class DexieDBService implements IDBService {
  private db: DSTRDatabase | null = null;
  private memoRepo: DexieMemoRepository | null = null;
  private tagStatsRepo: DexieTagStatsRepository | null = null;
  private channel: BroadcastChannel | null = null;
  private queue: Promise<void> = Promise.resolve();
  // 意図: 1回の投稿書き込みで vault の create / modify / metadataCache.changed が
  // 多重発火し、同一内容のインデックスと broadcast が連鎖して UI がガクつく。
  // 最後にインデックスした内容のハッシュを持ち、変化がなければ丸ごとスキップする。
  private lastIndexedHash = new Map<string, string>();
  // 意図: 増分イベント（変更・リネーム・削除）で既に最新化されたパスの集合。
  // フルスキャンのスナップショットは main 側での収集・読み込み中に行われた
  // 投稿より古いため、これらのパスをスナップショットで上書きすると
  // 「スキャン中の投稿が消える／削除したノートが復活する」巻き戻しが起きる。
  // scanAllNotes はこの集合のパスについて DB の現状を保持する。
  private incrementallyUpdatedPaths = new Set<string>();
  // 意図: getTagStats等の読み取りメソッドが初期化前に呼ばれた場合、
  // DBの初期化完了まで待機する。ただし、await時点のPromiseを別変数で参照することで、
  // await中に initPromise が更新されても古い参照を待ち続けるため、race conditionを防ぐ。
  // 初期値を Promise.resolve() にすると await が即座に完了するため、
  // 最初の読み取り前に initialize が必ず呼ばれるか、または initPromise が
  // 常に「呼び出し時点での」最新のPromiseを参照する仕組みが必要。
  private _initResolve: (() => void) | null = null;
  private initPromise: Promise<void> = new Promise<void>((resolve) => {
    this._initResolve = resolve;
  });

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          resolve(await task());
        } catch (e) {
          reject(toError(e));
        }
      });
    });
  }

  async initialize(options: DBServiceOptions): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
    this.db = new DSTRDatabase(options.appId);
    this.memoRepo = new DexieMemoRepository(this.db);
    this.tagStatsRepo = new DexieTagStatsRepository(this.db);
    this.channel = new BroadcastChannel(DB_UPDATE_CHANNEL_NAME);
    await this.db.open();
    // initPromise を resolve して、待機中のメソッドを続行させる
    if (this._initResolve) {
      this._initResolve();
    }
  }

  private notify(detail?: { path?: string }) {
    this.channel?.postMessage({ type: DB_UPDATED_MESSAGE_TYPE, detail });
  }

  async scanAllNotes(notes: ScannableNote[]): Promise<void> {
    // 起動時は workspace 復元や vault イベントの方が worker 初期化より先に
    // 到着し得る。読み取りと同様に初期化を待ってからキューへ積む。
    await this.initPromise;
    return this.enqueue(async () => {
      if (!this.db || !this.memoRepo || !this.tagStatsRepo) throw new Error("DB not initialized");

      // 増分更新済みパスは DB の現状（スナップショットより新しい）を保持し、
      // それ以外だけをスナップショットで置き換える。
      const preservedPaths = this.incrementallyUpdatedPaths;
      const freshNotes = notes.filter((n) => !preservedPaths.has(n.path));

      const preservedRecords: MemoRecord[] = [];
      for (const path of preservedPaths) {
        preservedRecords.push(...(await this.memoRepo.findByPath(path)));
      }

      await this.memoRepo.clear();
      await this.db.meta.clear();

      const freshRecords = freshNotes.flatMap(buildMemoRecordsForNote);
      await this.memoRepo.bulkPut([...freshRecords, ...preservedRecords]);

      // tagStats は memos 全体から再構築する（保持分と置換分が混ざるため、
      // 差分計算より全再構築のほうが単純で整合が保証される）。
      await this.tagStatsRepo.rebuild();

      await this.db.meta.put({
        key: "lastFullScanAt",
        value: new Date().toISOString(),
      });

      // 保持したパスの増分ハッシュは温存し、置き換えたパスだけ更新する
      const nextHash = new Map(freshNotes.map((n) => [n.path, hashScannableNote(n)]));
      for (const path of preservedPaths) {
        const hash = this.lastIndexedHash.get(path);
        if (hash) nextHash.set(path, hash);
      }
      this.lastIndexedHash = nextHash;

      this.notify();
    });
  }

  async onFileChanged(note: ScannableNote): Promise<void> {
    // workspace 復元中の変更イベントが initialize より先に届いても失敗させない。
    await this.initPromise;
    return this.enqueue(async () => {
      if (!this.db || !this.memoRepo || !this.tagStatsRepo) throw new Error("DB not initialized");

      const hash = hashScannableNote(note);
      if (this.lastIndexedHash.get(note.path) === hash) return;

      const records = buildMemoRecordsForNote(note);

      const removed = await this.tagStatsRepo.collectForPath(note.path);
      await this.memoRepo.deleteByPath(note.path);
      if (records.length) await this.memoRepo.bulkPut(records);

      const added = this.tagStatsRepo.collectFromRecords(records);
      await this.tagStatsRepo.applyDeltas(removed, added);

      // 意図: DB 書き込みが成功してからハッシュを記録する。先に記録すると、
      // 書き込み失敗時に同一内容の再送がハッシュで弾かれ、永久に反映されなくなる。
      this.lastIndexedHash.set(note.path, hash);
      this.incrementallyUpdatedPaths.add(note.path);

      this.notify({ path: note.path });
    });
  }

  async onFileDeleted(path: string): Promise<void> {
    // 起動時のファイル削除イベントもDBの準備完了後に処理する。
    await this.initPromise;
    return this.enqueue(async () => {
      if (!this.db || !this.memoRepo || !this.tagStatsRepo) throw new Error("DB not initialized");

      this.lastIndexedHash.delete(path);

      const removed = await this.tagStatsRepo.collectForPath(path);
      await this.memoRepo.deleteByPath(path);
      await this.tagStatsRepo.applyDeltas(removed, new Map());

      // 削除も「増分で最新化された」状態として記録し、
      // 実行中のフルスキャンの古いスナップショットがこのパスを復活させないようにする。
      this.incrementallyUpdatedPaths.add(path);

      this.notify({ path });
    });
  }

  async onFileRenamed(note: ScannableNote, oldPath: string): Promise<void> {
    // 起動時のリネームイベントもDBの準備完了後に処理する。
    await this.initPromise;
    return this.enqueue(async () => {
      if (!this.db || !this.memoRepo || !this.tagStatsRepo) throw new Error("DB not initialized");

      this.lastIndexedHash.delete(oldPath);

      const removed = await this.tagStatsRepo.collectForPath(oldPath);
      await this.memoRepo.deleteByPath(oldPath);
      await this.tagStatsRepo.applyDeltas(removed, new Map());

      // Then process the new note content
      const records = buildMemoRecordsForNote(note);
      if (records.length) await this.memoRepo.bulkPut(records);
      const added = this.tagStatsRepo.collectFromRecords(records);
      await this.tagStatsRepo.applyDeltas(new Map(), added);

      // 意図: 書き込み成功後にハッシュを記録する（onFileChanged と同じ理由）。
      // 旧パス・新パスとも増分更新済みとして記録し、フルスキャンの
      // 古いスナップショットによる旧パス復活・新パス巻き戻しを防ぐ。
      this.lastIndexedHash.set(note.path, hashScannableNote(note));
      this.incrementallyUpdatedPaths.add(oldPath);
      this.incrementallyUpdatedPaths.add(note.path);

      this.notify({ path: note.path });
    });
  }

  async getAllActiveDates(): Promise<string[]> {
    await this.initPromise;
    if (!this.memoRepo) throw new Error("DB not initialized");
    return await this.memoRepo.getAllActiveDates();
  }

  async getTagStats(): Promise<TagStatRecord[]> {
    await this.initPromise;
    if (!this.db) throw new Error("DB not initialized");
    return await this.db.tagStats.toArray();
  }

  async getMeta(key: string): Promise<string | undefined> {
    await this.initPromise;
    if (!this.db) throw new Error("DB not initialized");
    const rec = await this.db.meta.get(key);
    return rec ? (rec.value as string) : undefined;
  }

  async getMemos(params: {
    topicId?: string;
    startDate?: string;
    endDate?: string;
    query?: string;
    threadOnly?: boolean;
    limit?: number;
    noteGranularity?: Granularity;
  }): Promise<MemoRecord[]> {
    await this.initPromise;
    if (!this.memoRepo) throw new Error("DB not initialized");
    const { topicId, startDate, endDate, query, threadOnly, limit, noteGranularity } = params;

    if (startDate && endDate) {
      return await this.memoRepo.getVisibleMemosByDateRange({
        topicId,
        startDate,
        endDate,
        query,
        threadOnly,
        limit,
        noteGranularity,
      });
    }

    return await this.memoRepo.getLatestVisibleMemos(
      topicId,
      limit,
      query,
      threadOnly,
      noteGranularity,
    );
  }

  async getAllVisibleMemos(topicId?: string): Promise<MemoRecord[]> {
    await this.initPromise;
    if (!this.memoRepo) throw new Error("DB not initialized");
    return await this.memoRepo.getAllVisibleMemos(topicId);
  }

  async getPinnedMemos(params: {
    topicId?: string;
    query?: string;
    threadOnly?: boolean;
    limit?: number;
    noteGranularity?: Granularity;
  }): Promise<MemoRecord[]> {
    await this.initPromise;
    if (!this.memoRepo) throw new Error("DB not initialized");
    return await this.memoRepo.getPinnedVisibleMemos(params);
  }

  async countMemos(topicId?: string): Promise<number> {
    await this.initPromise;
    if (!this.memoRepo) throw new Error("DB not initialized");
    return await this.memoRepo.countVisibleMemos(topicId);
  }

  async dispose(): Promise<void> {
    await this.initPromise;
    if (this.db) {
      await this.db.close();
    }
    this.channel?.close();
  }
}
