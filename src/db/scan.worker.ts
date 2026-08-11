// src/db/scan.worker.ts
import { expose } from "comlink";
import { isDev } from "src/core/constants";
import { DexieDBService } from "src/db/impl/DexieDBService";
import type { IDBService } from "src/db/interfaces/IDBService";
import type { ScannableNote } from "src/db/worker-api";

const TAG = "[scan.worker]";

// ── Helpers ──────────────────────────────────────────────────────────────────

function estimateNotesBytes(notes?: ScannableNote[]): number {
  if (!notes?.length) return 0;
  try {
    const enc = new TextEncoder();
    return notes.reduce((sum, n) => sum + (n.content ? enc.encode(n.content).length : 0), 0);
  } catch {
    return notes.reduce((sum, n) => sum + (n.content?.length ?? 0), 0);
  }
}

/**
 * Wraps an async operation with structured start/done/error logging.
 * Re-throws the original error after logging.
 */
async function withLogging<T>(
  method: string,
  meta: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isDev) {
    return await fn();
  }

  console.log(TAG, `${method} called`, meta);
  const start = Date.now();
  try {
    const result = await fn();
    console.log(TAG, `${method} completed`, { durationMs: Date.now() - start });
    return result;
  } catch (err) {
    console.error(TAG, `${method} failed:`, err);
    throw err;
  }
}

// ── Global error handlers ─────────────────────────────────────────────────────

self.addEventListener("error", (ev: ErrorEvent) => {
  try {
    console.error(
      TAG,
      "Uncaught error in worker:",
      ev.message,
      ev.filename,
      ev.lineno,
      ev.colno,
      ev.error,
    );
  } catch {
    console.error(TAG, "Uncaught error in worker (failed to stringify event)", ev);
  }
});

self.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
  try {
    console.error(TAG, "Unhandled promise rejection in worker:", ev.reason);
  } catch {
    console.error(TAG, "Unhandled promise rejection in worker (failed to stringify reason)", ev);
  }
});

// ── Worker bootstrap ──────────────────────────────────────────────────────────

// console.log(TAG, "Worker loading...");

try {
  let dbService: DexieDBService | null = null;

  const db = (): DexieDBService => (dbService ??= new DexieDBService());

  const api: IDBService = {
    initialize: (options) =>
      withLogging("initialize", { appId: options?.appId }, () => db().initialize(options)),

    scanAllNotes: (notes) =>
      withLogging(
        "scanAllNotes",
        { count: notes?.length ?? 0, approxBytes: estimateNotesBytes(notes) },
        () => db().scanAllNotes(notes),
      ),

    onFileChanged: (note) =>
      withLogging("onFileChanged", { path: note?.path, len: note?.content?.length ?? 0 }, () =>
        db().onFileChanged(note),
      ),

    onFileDeleted: (path) => withLogging("onFileDeleted", { path }, () => db().onFileDeleted(path)),

    onFileRenamed: (note, oldPath) =>
      withLogging("onFileRenamed", { oldPath, newPath: note?.path }, () =>
        db().onFileRenamed(note, oldPath),
      ),

    getAllActiveDates: () =>
      withLogging("getAllActiveDates", {}, async () => {
        const res = await db().getAllActiveDates();
        // console.log(TAG, "getAllActiveDates count:", res?.length);
        return res;
      }),

    getTagStats: () =>
      withLogging("getTagStats", {}, async () => {
        const res = await db().getTagStats();
        // Ensure transferable plain objects (no Proxy / class instances)
        return Array.isArray(res) ? res.map((r) => ({ ...r })) : res;
      }),

    getMeta: (key) => withLogging("getMeta", { key }, () => db().getMeta(key)),

    getMemos: (params) =>
      withLogging("getMemos", { params }, async () => {
        const res = await db().getMemos(params);
        // console.log(TAG, "getMemos count:", res?.length);
        return res;
      }),

    getAllVisibleMemos: (topicId) =>
      withLogging("getAllVisibleMemos", { topicId }, async () => {
        const res = await db().getAllVisibleMemos(topicId);
        return res;
      }),

    getPinnedMemos: (params) =>
      withLogging("getPinnedMemos", { params }, async () => {
        const res = await db().getPinnedMemos(params);
        return res;
      }),

    countMemos: (topicId) =>
      withLogging("countMemos", { topicId }, async () => {
        const res = await db().countMemos(topicId);
        // console.log(TAG, "countMemos result:", res);
        return res;
      }),

    dispose: () =>
      withLogging("dispose", {}, async () => {
        const res = await dbService?.dispose();
        dbService = null;
        return res;
      }),
  };

  expose(api);

  // Signal that the worker is ready to receive messages
  try {
    self.postMessage?.({ type: "mfdi-worker-ready" });
  } catch {
    // ignore — non-critical
  }

  // console.log(TAG, "Worker exposed!");
} catch (e) {
  console.error(TAG, "Worker init error:", e);
}
