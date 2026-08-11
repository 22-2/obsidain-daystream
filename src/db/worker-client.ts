import { wrap, type Remote } from "comlink";
import type { DBServiceOptions, IDBService } from "src/db/interfaces/IDBService";
import ScanWorkerFactory from "src/db/scan.worker?worker&inline";

const DEFAULT_WORKER_REQUEST_TIMEOUT_MS = 5_000;

export class WorkerRequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`DB worker did not respond within ${timeoutMs}ms`);
    this.name = "WorkerRequestTimeoutError";
  }
}

export function withWorkerTimeout<T>(
  request: Promise<T>,
  timeoutMs = DEFAULT_WORKER_REQUEST_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new WorkerRequestTimeoutError(timeoutMs)),
      timeoutMs,
    );

    request.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export class WorkerClient {
  private static instance: Remote<IDBService> | null = null;
  private static worker: Worker | null = null;
  private static initializeOptions: DBServiceOptions | null = null;
  private static generation = 0;
  private static recoveryPromise: Promise<void> | null = null;

  static get(): Remote<IDBService> {
    if (!this.instance) {
      this.worker = new ScanWorkerFactory();
      this.instance = wrap<IDBService>(this.worker);
      this.generation += 1;
    }
    return this.instance;
  }

  static async initialize(options: DBServiceOptions): Promise<void> {
    this.initializeOptions = options;
    await this.get().initialize(options);
  }

  /**
   * Worker RPC がスリープ復帰などで応答しなくなった場合、Worker と DB 接続を
   * 作り直して同じ DB 操作を一度だけ再試行する。
   * 呼び出し側は Markdown への書き込みではなく、冪等なインデックス操作だけを渡す。
   */
  static async runWithRecovery<T>(
    operation: (db: Remote<IDBService>) => Promise<T>,
    timeoutMs = DEFAULT_WORKER_REQUEST_TIMEOUT_MS,
  ): Promise<T> {
    const db = this.get();
    const failedGeneration = this.generation;

    try {
      return await withWorkerTimeout(operation(db), timeoutMs);
    } catch (firstError) {
      await this.recover(failedGeneration, timeoutMs);

      try {
        return await withWorkerTimeout(operation(this.get()), timeoutMs);
      } catch (retryError) {
        throw new AggregateError(
          [firstError, retryError],
          "DB worker request failed after recovery",
        );
      }
    }
  }

  private static async recover(failedGeneration: number, timeoutMs: number): Promise<void> {
    // 別の要求が既に新しい Worker へ切り替えていれば、その復旧結果を再利用する。
    if (this.generation !== failedGeneration) return;

    if (!this.recoveryPromise) {
      this.recoveryPromise = (async () => {
        if (this.generation !== failedGeneration) return;

        this.worker?.terminate();
        this.worker = null;
        this.instance = null;

        const options = this.initializeOptions;
        if (!options) {
          throw new Error("DB worker initialization options are unavailable");
        }

        await withWorkerTimeout(this.get().initialize(options), timeoutMs);
      })().finally(() => {
        this.recoveryPromise = null;
      });
    }

    await this.recoveryPromise;
  }

  static async dispose() {
    const instance = this.instance;
    try {
      if (instance) {
        await withWorkerTimeout(instance.dispose(), 2_000);
      }
    } finally {
      this.worker?.terminate();
      this.instance = null;
      this.worker = null;
      this.initializeOptions = null;
      this.recoveryPromise = null;
    }
  }
}
