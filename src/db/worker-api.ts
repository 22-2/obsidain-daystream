import type { MemoRecord } from "src/db/mfdi-db";
import type { Granularity } from "src/ui/types";

export interface ScannableNote {
  path: string;
  noteName: string;
  topicId: string;
  noteGranularity: Granularity;
  noteDate: string;
  content: string;
}

interface WorkerTimings {
  started: number;
  finished: number;
  noteCount: number;
  bytes: number;
}

interface ScanResultEnvelope {
  records: MemoRecord[];
  timings?: WorkerTimings;
}

export interface ScanWorkerAPI {
  // Worker is stateless and only exposes parsing methods.
  // Both methods return an envelope that may include worker-side timings.
  scanFiles(files: ScannableNote[], meta?: { batchId?: string }): Promise<ScanResultEnvelope>;
  scanFile(file: ScannableNote, meta?: { batchId?: string }): Promise<ScanResultEnvelope>;
  dispose(): Promise<void>;
}
