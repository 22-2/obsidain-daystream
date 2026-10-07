import type { Remote } from "comlink";
import type { IDBService } from "src/core/db/interfaces/IDBService";
import { WorkerClient, WorkerRequestTimeoutError, withWorkerTimeout } from "src/core/db/worker-client";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("withWorkerTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.assign(WorkerClient, {
      instance: null,
      worker: null,
      initializeOptions: null,
      generation: 0,
      recoveryPromise: null,
      initialized: null,
      resolveInitialized: null,
    });
  });

  it("Worker が応答しない場合は指定時間で失敗する", async () => {
    vi.useFakeTimers();
    const request = withWorkerTimeout(new Promise<void>(() => {}), 1_000);
    const rejection = expect(request).rejects.toBeInstanceOf(WorkerRequestTimeoutError);

    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
  });

  it("Worker が応答した場合はタイマーを解除して結果を返す", async () => {
    vi.useFakeTimers();

    await expect(withWorkerTimeout(Promise.resolve("ok"), 1_000)).resolves.toBe("ok");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("失敗した Worker を終了し、DB を再初期化して一度だけ再試行する", async () => {
    const firstDb = {
      onFileDeleted: vi.fn(async () => {
        throw new Error("worker disconnected");
      }),
    };
    const recoveredDb = {
      initialize: vi.fn(async () => {}),
      onFileDeleted: vi.fn(async () => {}),
    };
    const terminate = vi.fn();

    Object.assign(WorkerClient, {
      worker: { terminate },
      initializeOptions: { appId: "vault-1" },
      generation: 1,
      initialized: Promise.resolve(),
    });
    vi.spyOn(WorkerClient, "get")
      .mockReturnValueOnce(firstDb as unknown as Remote<IDBService>)
      .mockReturnValue(recoveredDb as unknown as Remote<IDBService>);

    await WorkerClient.runWithRecovery((db) => db.onFileDeleted("daily/2026-08-01.md"), 1_000);

    expect(terminate).toHaveBeenCalledOnce();
    expect(recoveredDb.initialize).toHaveBeenCalledWith({ appId: "vault-1" });
    expect(recoveredDb.onFileDeleted).toHaveBeenCalledOnce();
  });

  it("初期化前に届いた要求は初期化完了まで待ち、Worker を作り直さない", async () => {
    vi.useFakeTimers();
    const db = {
      initialize: vi.fn(async () => {}),
      onFileDeleted: vi.fn(async () => {}),
    };
    const terminate = vi.fn();
    Object.assign(WorkerClient, { worker: { terminate }, generation: 1 });
    vi.spyOn(WorkerClient, "get").mockReturnValue(db as unknown as Remote<IDBService>);

    const request = WorkerClient.runWithRecovery((d) => d.onFileDeleted("a.md"), 1_000);
    // 意図: タイムアウトを超えて初期化が遅れても、その待ち時間は応答なしと扱わない。
    await vi.advanceTimersByTimeAsync(5_000);
    expect(db.onFileDeleted).not.toHaveBeenCalled();

    await WorkerClient.initialize({ appId: "vault-1" });
    await request;

    expect(db.onFileDeleted).toHaveBeenCalledOnce();
    expect(terminate).not.toHaveBeenCalled();
  });
});
