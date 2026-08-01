import type { TFile } from "obsidian";
import PQueue from "p-queue";
import {
  DEFAULT_QUEUE_CONCURRENCY,
  DEFAULT_SCAN_CHUNK_SIZE,
} from "src/db/indexer/types";
import {
  collectScanTargets,
  normalizeTopics,
  toScannableNote,
} from "src/db/indexer/utils";
import { inferNoteIdentityFromFile } from "src/db/note-file-identity";
import { WorkerClient } from "src/db/worker-client";
import type { Settings } from "src/settings";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TagIndexerOptions {
  queueConcurrency?: number;
  scanChunkSize?: number;
}

// ---------------------------------------------------------------------------
// Per-path serialization
// ---------------------------------------------------------------------------

// 意図: 同一パスに対する「read → worker 送信」を直列化する。
// vault の create / modify / metadataCache.changed は 1 回の書き込みで多重発火し、
// ハンドラ内の cachedRead は開始順と完了順が入れ替わることがある。
// 古い内容（特に新規作成直後の空内容）の送信が、投稿直後の明示インデックスより
// 後に worker へ届くと、DB が古い内容で巻き戻り
// 「投稿が消える／遅れて反映される」原因になっていた。
// パス単位で直列化すると、各タスクの read は直前のタスク完了後に実行されるため
// 常に最新以上の内容を読み、巻き戻しが構造的に起きなくなる。
const pathChains = new Map<string, Promise<void>>();

function enqueueForPath<T>(path: string, task: () => Promise<T>): Promise<T> {
  const prev = pathChains.get(path) ?? Promise.resolve();
  const result = prev.then(task);
  // エラーで後続タスクを止めないよう、チェーンには握りつぶした Promise を積む
  const tail = result.then(
    () => undefined,
    () => undefined,
  );
  pathChains.set(path, tail);
  void tail.then(() => {
    // 自分がチェーン末尾のままなら Map から掃除してリークを防ぐ
    if (pathChains.get(path) === tail) pathChains.delete(path);
  });
  return result;
}

type NoteIdentity = NonNullable<ReturnType<typeof inferNoteIdentityFromFile>>;

function toWorkerNote(file: TFile, identity: NoteIdentity, content: string) {
  return {
    path: file.path,
    noteName: file.basename,
    topicId: identity.topicId,
    noteGranularity: identity.granularity,
    noteDate: identity.noteDate.toISOString(),
    content,
  };
}

// ---------------------------------------------------------------------------
// Direct indexing
// ---------------------------------------------------------------------------

/**
 * ノートの内容を指定して直接 DB インデックスへ反映する。
 *
 * 意図: 投稿の書き込み直後に vault イベント経由の非同期インデックスを待つと、
 * refreshPosts 時点で DB が古いままになり「投稿が遅れて反映される」レースが起きる。
 * 書き込み側が確定済みの content を渡して await することで、
 * 次の SWR 再検証で必ず新しい投稿が読めることを保証する
 * （cachedRead の stale 読みも回避できる）。
 */
export async function indexNoteContent(
  shell: ObsidianAppShell,
  file: TFile,
  settings: Settings,
  content: string,
): Promise<void> {
  const identity = inferNoteIdentityFromFile(
    file,
    normalizeTopics(settings.topics),
    shell,
  );
  if (!identity) return;

  await enqueueForPath(file.path, async () => {
    const note = toWorkerNote(file, identity, content);
    await WorkerClient.runWithRecovery((dbService) =>
      dbService.onFileChanged(note),
    );
  });
}

// ---------------------------------------------------------------------------
// TagIndexer
// ---------------------------------------------------------------------------

export class TagIndexer {
  private readonly queueConcurrency: number;
  private readonly scanChunkSize: number;

  constructor(_appId: string, options: TagIndexerOptions = {}) {
    this.queueConcurrency =
      options.queueConcurrency ?? DEFAULT_QUEUE_CONCURRENCY;
    this.scanChunkSize = options.scanChunkSize ?? DEFAULT_SCAN_CHUNK_SIZE;
  }

  // -------------------------------------------------------------------------
  // Full scan
  // -------------------------------------------------------------------------

  async scanAllNotes(
    shell: ObsidianAppShell,
    settings: Settings,
  ): Promise<void> {
    const targets = collectScanTargets(shell, settings);
    const readQueue = new PQueue({ concurrency: this.queueConcurrency });

    const scannableNotes = await Promise.all(
      targets.map((t) => readQueue.add(() => toScannableNote(shell, t))),
    );

    const validNotes = scannableNotes.filter(
      (n): n is NonNullable<typeof n> => n !== null,
    );

    await WorkerClient.runWithRecovery(
      (dbService) => dbService.scanAllNotes(validNotes),
      120_000,
    );
  }

  // -------------------------------------------------------------------------
  // Incremental updates
  // -------------------------------------------------------------------------

  async onFileChanged(
    shell: ObsidianAppShell,
    file: TFile,
    settings: Settings,
  ): Promise<void> {
    // 意図: 対象外ファイルで無駄な read をしないよう、identity 判定を read より先に行う。
    const identity = inferNoteIdentityFromFile(
      file,
      normalizeTopics(settings.topics),
      shell,
    );
    if (!identity) return;

    // 意図: read はチェーン内で行う。イベント発火時点ではなく実行順が来た
    // 時点の内容を読むことで、先行タスク（＝先行する書き込みのインデックス）
    // より古い内容を worker へ送らないことを保証する。
    await enqueueForPath(file.path, async () => {
      const content = await shell.cachedReadFile(file);
      const note = toWorkerNote(file, identity, content);
      await WorkerClient.runWithRecovery((dbService) =>
        dbService.onFileChanged(note),
      );
    });
  }

  async onFileDeleted(path: string): Promise<void> {
    await WorkerClient.runWithRecovery((dbService) =>
      dbService.onFileDeleted(path),
    );
  }

  async onFileRenamed(
    shell: ObsidianAppShell,
    file: TFile,
    oldPath: string,
    settings: Settings,
  ): Promise<void> {
    const identity = inferNoteIdentityFromFile(
      file,
      normalizeTopics(settings.topics),
      shell,
    );
    if (!identity) return;

    // rename も新パスのチェーンに乗せ、他イベントとの順序入れ替わりを防ぐ。
    await enqueueForPath(file.path, async () => {
      const content = await shell.cachedReadFile(file);
      const note = toWorkerNote(file, identity, content);
      await WorkerClient.runWithRecovery((dbService) =>
        dbService.onFileRenamed(note, oldPath),
      );
    });
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async dispose(): Promise<void> {
    // WorkerClient is a singleton, so we don't necessarily want to dispose it here
    // unless the entire app is shutting down.
  }
}
