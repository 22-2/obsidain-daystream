import type { Granularity } from "src/core/domain/granularity";

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------

export interface MemoRecord {
  id: string;
  path: string;
  noteName: string;
  topicId: string;
  noteGranularity: Granularity;
  content: string;
  tags: string[];
  metadataJson: string;
  startOffset: number;
  endOffset: number;
  bodyStartOffset: number;
  createdAt: string;
  noteDate: string; // YYYY-MM-DD
  updatedAt: string;
  archived: 0 | 1;
  deleted: 0 | 1;
  pinned: 0 | 1;
}

interface MetaRecord {
  key: string;
  value: unknown;
}

export interface TagStatRecord {
  tag: string;
  count: number;
  updatedAt: string;
}

function getMFDIDatabaseName(appId: string): string {
  return `${appId}-mfdi-db`;
}

// ---------------------------------------------------------------------------
// Low-level IDB helpers
// ---------------------------------------------------------------------------

/** IDBRequest を Promise に変換 */
function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * カーソルを走査して配列を返す。
 * filter / limit はすべてここで完結させる。
 */
function cursorAll<T>(
  source: IDBIndex | IDBObjectStore,
  range: IDBKeyRange | null,
  direction: IDBCursorDirection,
  filter?: (v: T) => boolean,
  limit?: number,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    const cursorReq = source.openCursor(range, direction);

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor || (limit != null && results.length >= limit)) {
        return resolve(results);
      }
      const value = cursor.value as T;
      if (!filter || filter(value)) {
        results.push(value);
      }
      cursor.continue();
    };

    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

function isThreadRootMemo(memo: MemoRecord): boolean {
  try {
    const parsed = JSON.parse(memo.metadataJson) as Record<string, unknown>;
    const threadId = parsed.mfdiId;
    const parentId = parsed.parentId;
    return (
      typeof threadId === "string" && threadId.length > 0 && (parentId == null || parentId === "")
    );
  } catch {
    return false;
  }
}

/**
 * 検索条件を 1 つの述語にまとめる。条件が無ければ undefined を返す。
 */
function buildMemoFilter(params: {
  query?: string;
  threadOnly?: boolean;
  noteGranularity?: Granularity;
}): ((m: MemoRecord) => boolean) | undefined {
  const { query, threadOnly = false, noteGranularity } = params;
  const normalizedQuery = query?.trim().toLowerCase() ?? "";

  if (!normalizedQuery && !threadOnly && noteGranularity == null) {
    return undefined;
  }

  return (memo) => {
    if (noteGranularity != null && memo.noteGranularity !== noteGranularity) {
      return false;
    }
    if (normalizedQuery) {
      // 意図: 検索タブの単一入力から本文・URL（本文/パス）・タグを横断して探せるようにする。
      const searchableText = [
        memo.content,
        memo.path,
        ...memo.tags,
        ...memo.tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
      ]
        .join("\n")
        .toLowerCase();
      if (!searchableText.includes(normalizedQuery)) return false;
    }
    if (threadOnly && !isThreadRootMemo(memo)) {
      return false;
    }
    return true;
  };
}

function buildVisibleMemoPinnedRange(
  store: IDBObjectStore,
  params: {
    topicId?: string;
    pinned: 0 | 1;
    startDate?: string;
    endDate?: string;
  },
): { index: IDBIndex; range: IDBKeyRange } {
  const { topicId, pinned, startDate, endDate } = params;

  if (startDate != null && endDate != null) {
    return topicId
      ? {
          index: store.index("[topicId+archived+deleted+pinned+createdAt]"),
          range: IDBKeyRange.bound(
            [topicId, 0, 0, pinned, startDate],
            [topicId, 0, 0, pinned, endDate],
          ),
        }
      : {
          index: store.index("[archived+deleted+pinned+createdAt]"),
          range: IDBKeyRange.bound([0, 0, pinned, startDate], [0, 0, pinned, endDate]),
        };
  }

  return topicId
    ? {
        index: store.index("[topicId+archived+deleted+pinned+createdAt]"),
        range: IDBKeyRange.bound([topicId, 0, 0, pinned, ""], [topicId, 0, 0, pinned, "\uffff"]),
      }
    : {
        index: store.index("[archived+deleted+pinned+createdAt]"),
        range: IDBKeyRange.bound([0, 0, pinned, ""], [0, 0, pinned, "\uffff"]),
      };
}

// ---------------------------------------------------------------------------
// Store accessor types
// ---------------------------------------------------------------------------

/** トランザクション取得コールバック */
type StoreCallbackResolver = <T>(
  name: StoreName,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T,
) => Promise<T>;

// ---------------------------------------------------------------------------
// Store accessor classes
// ---------------------------------------------------------------------------

class MemoStore {
  readonly _name = "memos" as const;
  constructor(private readonly withStore: StoreCallbackResolver) {}

  private perform<T>(
    mode: IDBTransactionMode,
    callback: (s: IDBObjectStore) => Promise<T> | T,
  ): Promise<T> {
    return this.withStore(this._name, mode, callback);
  }

  clear(): Promise<undefined> {
    return this.perform("readwrite", (s) => req(s.clear()));
  }

  get(id: string): Promise<MemoRecord | undefined> {
    return this.perform("readonly", (s) => req(s.get(id)));
  }

  put(item: MemoRecord): Promise<IDBValidKey> {
    return this.perform("readwrite", (s) => req(s.put(item)));
  }

  delete(id: string): Promise<undefined> {
    return this.perform("readwrite", (s) => req(s.delete(id)));
  }

  toArray(): Promise<MemoRecord[]> {
    return this.perform("readonly", (s) => req(s.getAll()));
  }

  bulkPut(items: MemoRecord[]): Promise<void> {
    return this.perform("readwrite", async (s) => {
      await Promise.all(items.map((item) => req(s.put(item))));
    });
  }

  where(indexName: string) {
    return {
      equals: (value: unknown) => ({
        toArray: (): Promise<MemoRecord[]> => {
          return this.perform("readonly", (s) =>
            req(s.index(indexName).getAll(IDBKeyRange.only(value))),
          );
        },
        delete: (): Promise<void> => {
          return this.perform("readwrite", (s) => {
            const request = s.index(indexName).openKeyCursor(IDBKeyRange.only(value));
            return new Promise<void>((resolve, reject) => {
              request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                  s.delete(cursor.primaryKey);
                  cursor.continue();
                } else {
                  resolve();
                }
              };
              request.onerror = () => reject(request.error);
            });
          });
        },
      }),
    };
  }
}

class MetaStore {
  readonly _name = "meta" as const;
  constructor(private readonly withStore: StoreCallbackResolver) {}

  private perform<T>(
    mode: IDBTransactionMode,
    callback: (s: IDBObjectStore) => Promise<T> | T,
  ): Promise<T> {
    return this.withStore(this._name, mode, callback);
  }

  clear(): Promise<undefined> {
    return this.perform("readwrite", (s) => req(s.clear()));
  }

  put(item: MetaRecord): Promise<IDBValidKey> {
    return this.perform("readwrite", (s) => req(s.put(item)));
  }

  get(key: string): Promise<MetaRecord | undefined> {
    return this.perform("readonly", (s) => req(s.get(key)));
  }
}

class TagStatStore {
  readonly _name = "tagStats" as const;
  constructor(private readonly withStore: StoreCallbackResolver) {}

  private perform<T>(
    mode: IDBTransactionMode,
    callback: (s: IDBObjectStore) => Promise<T> | T,
  ): Promise<T> {
    return this.withStore(this._name, mode, callback);
  }

  clear(): Promise<undefined> {
    return this.perform("readwrite", (s) => req(s.clear()));
  }

  put(item: TagStatRecord): Promise<IDBValidKey> {
    return this.perform("readwrite", (s) => req(s.put(item)));
  }

  get(tag: string): Promise<TagStatRecord | undefined> {
    return this.perform("readonly", (s) => req(s.get(tag)));
  }

  toArray(): Promise<TagStatRecord[]> {
    return this.perform("readonly", (s) => req(s.getAll()));
  }

  bulkPut(items: TagStatRecord[]): Promise<void> {
    return this.perform("readwrite", async (s) => {
      await Promise.all(items.map((item) => req(s.put(item))));
    });
  }

  bulkGet(tags: string[]): Promise<(TagStatRecord | undefined)[]> {
    return this.perform("readonly", async (s) => {
      return Promise.all(tags.map((tag) => req(s.get(tag))));
    });
  }

  bulkDelete(tags: string[]): Promise<void> {
    return this.perform("readwrite", async (s) => {
      await Promise.all(tags.map((tag) => req(s.delete(tag))));
    });
  }
}

// ---------------------------------------------------------------------------
// Transaction context
// ---------------------------------------------------------------------------

type StoreName = "memos" | "meta" | "tagStats";

interface TransactableStore {
  readonly _name: StoreName;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const DB_VERSION = 7;

/**
 * Dexie を完全に排除し、生の IndexedDB をラップしたデータベースクラス。
 *
 * 【設計意図（メンタルモデル）】
 * 1. 既存の Repository や Service との互換性を最小限の変更で維持するため、
 *    Dexie の API サブセット（memos.where(...).equals(...).toArray() 等）をエミュレートしています。
 * 2. 生の IDBTransaction は、イベントループのティックやリクエストの有無で自動コミットされるため、
 *    callback 内で非同期処理を行う transaction() メソッドでは Promise でライフサイクルを管理します。
 * 3. 複数の Repository が同じトランザクションを共有できるよう、`_activeTx` による簡易的な
 *    トランザクション再利用（ネスト風の挙動）を実装しています。これにより、原子性を担保します。
 */
export class MFDIDatabase {
  private readonly _db: Promise<IDBDatabase>;
  private readonly _name: string;
  private _txStack: IDBTransaction[] = [];

  // store accessor インスタンスは一度だけ生成する
  public readonly memos: MemoStore;
  public readonly meta: MetaStore;
  public readonly tagStats: TagStatStore;

  constructor(appId: string) {
    this._name = getMFDIDatabaseName(appId);
    // インスタンス作成時に Promise を初期化
    this._db = this.openDatabase();

    const withStore = this.withStoreCallback.bind(this);
    this.memos = new MemoStore(withStore);
    this.meta = new MetaStore(withStore);
    this.tagStats = new TagStatStore(withStore);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async open(): Promise<this> {
    await this._db;
    return this;
  }

  async close(): Promise<void> {
    const db = await this._db;
    db.close();
  }

  async delete(): Promise<void> {
    await this.close();
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.deleteDatabase(this._name);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  // ---------------------------------------------------------------------------
  // Transaction
  // ---------------------------------------------------------------------------

  async transaction<T>(
    mode: "rw" | "r",
    stores: TransactableStore[],
    callback: () => Promise<T>,
  ): Promise<T> {
    const db = await this._db;
    const storeNames = stores.map((s) => s._name);
    const idbMode: IDBTransactionMode = mode === "rw" ? "readwrite" : "readonly";
    const tx = db.transaction(storeNames, idbMode);

    this._txStack.push(tx);
    const cleanup = () => {
      this._txStack = this._txStack.filter((item) => item !== tx);
    };

    return new Promise<T>((resolve, reject) => {
      let result: T;
      let callbackError: unknown;

      tx.oncomplete = () => {
        cleanup();
        resolve(result);
      };
      tx.onerror = () => {
        cleanup();
        reject(callbackError ?? tx.error);
      };
      tx.onabort = () => {
        cleanup();
        reject(callbackError ?? new Error("Transaction aborted"));
      };

      callback()
        .then((res) => {
          result = res;
        })
        .catch((err) => {
          callbackError = err;
          tx.abort();
        });
    });
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getAllActiveDates(): Promise<string[]> {
    const memos = await this.withStoreCallback("memos", "readonly", async (s) => {
      const index = s.index("[archived+deleted]");
      const range = IDBKeyRange.only([0, 0]);
      return cursorAll<MemoRecord>(index, range, "next", undefined, undefined);
    });
    const dateSet = new Set(memos.map((m) => m.noteDate));
    return Array.from(dateSet).sort();
  }

  async getLatestVisibleMemos(
    topicId?: string,
    limit = 300,
    query?: string,
    threadOnly = false,
    noteGranularity?: Granularity,
  ): Promise<MemoRecord[]> {
    return this.getPinnedFirstVisibleMemos({ topicId, limit, query, threadOnly, noteGranularity });
  }

  async getAllVisibleMemos(topicId?: string): Promise<MemoRecord[]> {
    return this.withStoreCallback("memos", "readonly", async (store) => {
      const results: MemoRecord[] = [];

      for (const pinned of [1, 0] as const) {
        const { index, range } = buildVisibleMemoPinnedRange(store, {
          topicId,
          pinned,
        });
        results.push(...(await cursorAll<MemoRecord>(index, range, "prev")));
      }

      return results;
    });
  }

  async countVisibleMemos(topicId?: string): Promise<number> {
    return this.withStoreCallback("memos", "readonly", async (s) => {
      if (topicId) {
        return req(s.index("[topicId+archived+deleted]").count(IDBKeyRange.only([topicId, 0, 0])));
      }
      return req(s.index("[archived+deleted]").count(IDBKeyRange.only([0, 0])));
    });
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
    const {
      topicId,
      startDate,
      endDate,
      limit,
      query: searchQuery,
      threadOnly = false,
      noteGranularity,
    } = params;

    return this.getPinnedFirstVisibleMemos({
      topicId,
      startDate,
      endDate,
      limit,
      query: searchQuery,
      threadOnly,
      noteGranularity,
    });
  }

  async getPinnedVisibleMemos(params: {
    topicId?: string;
    query?: string;
    threadOnly?: boolean;
    limit?: number;
    noteGranularity?: Granularity;
  }): Promise<MemoRecord[]> {
    const { topicId, query, threadOnly = false, limit, noteGranularity } = params;
    const filter = buildMemoFilter({ query, threadOnly, noteGranularity });
    const effectiveLimit = limit || 300;

    return this.withStoreCallback("memos", "readonly", async (store) => {
      const { index, range } = buildVisibleMemoPinnedRange(store, {
        topicId,
        pinned: 1,
      });

      // 意図: pinned はタイムラインのスクロール位置に依存せず先頭へ出したい。
      // DB の複合 index から pinned レコードだけを直接抜き出して返す。
      return await cursorAll<MemoRecord>(index, range, "prev", filter, effectiveLimit);
    });
  }

  private async getPinnedFirstVisibleMemos(params: {
    topicId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    query?: string;
    threadOnly?: boolean;
    noteGranularity?: Granularity;
  }): Promise<MemoRecord[]> {
    const { topicId, startDate, endDate, limit, query, threadOnly = false, noteGranularity } =
      params;
    const filter = buildMemoFilter({ query, threadOnly, noteGranularity });
    const effectiveLimit = limit || 300;

    return this.withStoreCallback("memos", "readonly", async (store) => {
      const results: MemoRecord[] = [];

      // 意図: DB 取得段階でも pinned → timestamp の順を作っておくことで、
      // タイムラインのページング中もピン留めが先頭に寄りやすくなる。
      for (const pinned of [1, 0] as const) {
        if (results.length >= effectiveLimit) {
          break;
        }

        const { index, range } = buildVisibleMemoPinnedRange(store, {
          topicId,
          pinned,
          startDate,
          endDate,
        });

        const batch = await cursorAll<MemoRecord>(
          index,
          range,
          "prev",
          filter,
          effectiveLimit - results.length,
        );
        results.push(...batch);
      }

      return results;
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** store を取得してコールバックを実行する内部ユーティリティ */
  private async withStoreCallback<T>(
    name: StoreName,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => Promise<T> | T,
  ): Promise<T> {
    // スタック末尾（最も内側）のトランザクションを優先して再利用
    for (let i = this._txStack.length - 1; i >= 0; i--) {
      const tx = this._txStack[i];
      if ([...tx.objectStoreNames].includes(name)) {
        // 要求されたモードが readonly なら再利用可能。
        // readwrite の場合、再利用する tx も readwrite である必要がある。
        if (mode === "readonly" || tx.mode === "readwrite") {
          return callback(tx.objectStore(name));
        }
      }
    }

    const db = await this._db;
    const tx = db.transaction(name, mode);
    return callback(tx.objectStore(name));
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const openReq = indexedDB.open(this._name, DB_VERSION);

      openReq.onupgradeneeded = () => {
        const db = openReq.result;
        MFDIDatabase.migrate(db, openReq.transaction!);
      };

      openReq.onsuccess = () => resolve(openReq.result);
      openReq.onerror = () => reject(openReq.error);
    });
  }

  /** スキーママイグレーション（onupgradeneeded から切り出し） */
  private static migrate(db: IDBDatabase, tx: IDBTransaction): void {
    // ---- memos --------------------------------------------------------------
    const memoStore = db.objectStoreNames.contains("memos")
      ? tx.objectStore("memos")
      : db.createObjectStore("memos", { keyPath: "id" });

    const addIndex = (name: string, keyPath: string | string[], opts?: IDBIndexParameters) => {
      if (!memoStore.indexNames.contains(name)) {
        memoStore.createIndex(name, keyPath, opts);
      }
    };

    addIndex("path", "path");
    addIndex("noteName", "noteName");
    addIndex("topicId", "topicId");
    addIndex("noteGranularity", "noteGranularity");
    addIndex("noteDate", "noteDate");
    addIndex("tags", "tags", { multiEntry: true });
    addIndex("createdAt", "createdAt");
    addIndex("updatedAt", "updatedAt");
    addIndex("archived", "archived");
    addIndex("deleted", "deleted");
    addIndex("pinned", "pinned");
    addIndex("[topicId+noteGranularity]", ["topicId", "noteGranularity"]);
    addIndex("[archived+deleted]", ["archived", "deleted"]);
    addIndex("[topicId+archived+deleted]", ["topicId", "archived", "deleted"]);
    addIndex("[archived+deleted+createdAt]", ["archived", "deleted", "createdAt"]);
    addIndex("[archived+deleted+pinned+createdAt]", ["archived", "deleted", "pinned", "createdAt"]);
    addIndex("[topicId+archived+deleted+createdAt]", [
      "topicId",
      "archived",
      "deleted",
      "createdAt",
    ]);
    addIndex("[topicId+archived+deleted+pinned+createdAt]", [
      "topicId",
      "archived",
      "deleted",
      "pinned",
      "createdAt",
    ]);

    const pinnedBackfillRequest = memoStore.openCursor();
    pinnedBackfillRequest.onsuccess = () => {
      const cursor = pinnedBackfillRequest.result;
      if (!cursor) {
        return;
      }

      const value = cursor.value as Partial<MemoRecord>;
      if (value.pinned !== 0 && value.pinned !== 1) {
        // 意図: 既存DBは pinned 列を持たないため、upgrade時に 0 を埋めないと
        // 新しい compound index から未ピン投稿が見えなくなる。
        cursor.update({
          ...value,
          pinned: 0,
        });
      }

      cursor.continue();
    };

    // ---- meta ---------------------------------------------------------------
    if (!db.objectStoreNames.contains("meta")) {
      db.createObjectStore("meta", { keyPath: "key" });
    }

    // ---- tagStats -----------------------------------------------------------
    if (!db.objectStoreNames.contains("tagStats")) {
      const tagStore = db.createObjectStore("tagStats", { keyPath: "tag" });
      tagStore.createIndex("count", "count");
      tagStore.createIndex("updatedAt", "updatedAt");
    }
  }
}
