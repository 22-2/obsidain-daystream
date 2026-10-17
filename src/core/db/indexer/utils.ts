import type { Topic } from "src/core/topic";
import { DEFAULT_TOPIC } from "src/core/topic";
import type { ScanTarget } from "src/core/db/indexer/types";
import type { ScannableNote } from "src/core/db/worker-api";
import { getAllTopicNotes, getDateFromFile } from "src/core/platform/daily-notes";
import type { Settings } from "src/core/domain/settings";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { GRANULARITIES } from "src/core/domain/granularity";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function normalizeTopics(topics: Topic[]): Topic[] {
  const map = new Map<string, Topic>([[DEFAULT_TOPIC.id, DEFAULT_TOPIC]]);
  for (const topic of topics) {
    map.set(topic.id, topic);
  }
  return [...map.values()];
}

function isSameTarget(a: ScanTarget, b: ScanTarget): boolean {
  return (
    a.path === b.path &&
    a.topicId === b.topicId &&
    a.noteGranularity === b.noteGranularity &&
    a.noteDate === b.noteDate
  );
}

export function collectScanTargets(shell: ObsidianAppShell, settings: Settings): ScanTarget[] {
  const uniqueTargets = new Map<string, ScanTarget>();
  const ambiguousPaths = new Set<string>();

  for (const topic of normalizeTopics(settings.topics)) {
    for (const granularity of GRANULARITIES) {
      const notes = getAllTopicNotes(shell, granularity, topic.id);

      for (const file of Object.values(notes)) {
        if (ambiguousPaths.has(file.path)) continue;

        const noteDate = getDateFromFile(file, granularity, shell, topic.id)?.toISOString() ?? "";
        if (!noteDate) continue;

        const candidate: ScanTarget = {
          file,
          path: file.path,
          noteName: file.basename,
          topicId: topic.id,
          noteGranularity: granularity,
          noteDate,
        };

        const existing = uniqueTargets.get(file.path);
        if (!existing) {
          uniqueTargets.set(file.path, candidate);
          continue;
        }

        if (!isSameTarget(existing, candidate)) {
          uniqueTargets.delete(file.path);
          ambiguousPaths.add(file.path);
        }
      }
    }
  }

  return [...uniqueTargets.values()];
}

export async function toScannableNote(
  shell: ObsidianAppShell,
  target: ScanTarget,
): Promise<ScannableNote> {
  const content = await shell.cachedReadFile(target.file);
  return {
    path: target.path,
    noteName: target.noteName,
    topicId: target.topicId,
    noteGranularity: target.noteGranularity,
    noteDate: target.noteDate,
    content,
  };
}

function generateBatchId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function estimateBytes(notes: ScannableNote[]): number {
  try {
    const enc = new TextEncoder();
    return notes.reduce((sum, n) => sum + enc.encode(n.content).length, 0);
  } catch {
    return notes.reduce((sum, n) => sum + n.content.length, 0);
  }
}
