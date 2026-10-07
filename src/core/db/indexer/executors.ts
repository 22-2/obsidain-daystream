import type { Remote } from "comlink";
import type { ScanWorkerPool } from "src/core/db/scan-worker-pool";
import type { ScannableNote, ScanWorkerAPI } from "src/core/db/worker-api";

// ---------------------------------------------------------------------------
// Scan executor abstraction
// Centralises the "direct API vs worker pool" branching in one place,
// so the rest of TagIndexer never has to think about it.
// ---------------------------------------------------------------------------

export class DirectApiExecutor implements ScanWorkerAPI {
  constructor(private readonly api: ScanWorkerAPI | Remote<ScanWorkerAPI>) {}

  scanFiles(files: ScannableNote[], meta?: { batchId?: string }) {
    return this.api.scanFiles(files, meta);
  }

  scanFile(note: ScannableNote, meta?: { batchId?: string }) {
    return this.api.scanFile(note, meta);
  }

  async dispose() {
    // nothing to tear down
  }
}

export class WorkerPoolExecutor implements ScanWorkerAPI {
  constructor(private readonly pool: ScanWorkerPool) {}

  scanFiles(files: ScannableNote[], meta?: { batchId?: string }) {
    const { remote } = this.pool.next();
    return remote.scanFiles(files, meta);
  }

  scanFile(note: ScannableNote, meta?: { batchId?: string }) {
    const { remote } = this.pool.next();
    return remote.scanFile(note, meta);
  }

  async dispose() {
    await this.pool.dispose();
  }
}
