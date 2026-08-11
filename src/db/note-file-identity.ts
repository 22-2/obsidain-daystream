import type { TFile } from "obsidian";
import type { Topic } from "src/core/topic";
import { getDateFromFilename } from "src/lib/daily-notes/utils";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import { GRANULARITIES, type Granularity } from "src/ui/config/granularity-config";
import type { MomentLike } from "src/ui/types";

interface NoteFileIdentity {
  topicId: string;
  granularity: Granularity;
  noteDate: MomentLike;
}

function normalizeTopicIds(topics: Array<Pick<Topic, "id">> | string[]): string[] {
  const topicIds = topics.map((topic) => (typeof topic === "string" ? topic : topic.id));
  return [...new Set(topicIds)];
}

export function inferNoteIdentityFromFilename(
  filename: string,
  topics: Array<Pick<Topic, "id">> | string[],
  shell: ObsidianAppShell,
): NoteFileIdentity | null {
  const matches: NoteFileIdentity[] = [];

  for (const topicId of normalizeTopicIds(topics)) {
    for (const granularity of GRANULARITIES) {
      const noteDate = getDateFromFilename(filename, granularity, shell, topicId);
      if (!noteDate) {
        continue;
      }

      matches.push({ topicId, granularity, noteDate });
    }
  }

  return matches.length === 1 ? matches[0] : null;
}

export function inferNoteIdentityFromFile(
  file: Pick<TFile, "basename">,
  topics: Array<Pick<Topic, "id">> | string[],
  shell: ObsidianAppShell,
): NoteFileIdentity | null {
  return inferNoteIdentityFromFilename(file.basename, topics, shell);
}
