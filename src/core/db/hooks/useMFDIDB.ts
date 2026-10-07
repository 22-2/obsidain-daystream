import type { Remote } from "comlink";
import type { IDBService } from "src/core/db/interfaces/IDBService";
import { WorkerClient } from "src/core/db/worker-client";

/**
 * シングルソース化されたWorker内のデータベースサービスを取得するフック。
 */
export function useMFDIDB(): Remote<IDBService> {
  return WorkerClient.get();
}
