// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

import type { TFile } from "obsidian";
import type { GRANULARITIES } from "src/core/domain/granularity";

export const DEFAULT_QUEUE_CONCURRENCY = 8;
export const DEFAULT_SCAN_CHUNK_SIZE = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanTarget {
  file: TFile;
  path: string;
  noteName: string;
  topicId: string;
  noteDate: string;
  noteGranularity: (typeof GRANULARITIES)[number];
}
