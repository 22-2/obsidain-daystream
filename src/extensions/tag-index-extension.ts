import type { TFile } from "obsidian";
import type { TagIndexerOptions } from "src/db/indexer/tag-indexer";
import { TagIndexer } from "src/db/indexer/tag-indexer";
import type { Settings } from "src/settings";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";

export interface TagIndexExtension {
  fullScan: (shell: ObsidianAppShell, settings: Settings) => Promise<void>;
  handleFileChanged: (shell: ObsidianAppShell, file: TFile, settings: Settings) => Promise<void>;
  handleFileRenamed: (
    shell: ObsidianAppShell,
    file: TFile,
    oldPath: string,
    settings: Settings,
  ) => Promise<void>;
  handleFileDeleted: (path: string) => Promise<void>;
  dispose: () => Promise<void>;
}

type TagIndexerLike = Pick<
  TagIndexer,
  "scanAllNotes" | "onFileChanged" | "onFileRenamed" | "onFileDeleted" | "dispose"
>;

export function adaptTagIndexer(indexer: TagIndexerLike): TagIndexExtension {
  return {
    fullScan: (shell, settings) => indexer.scanAllNotes(shell, settings),
    handleFileChanged: (shell, file, settings) => indexer.onFileChanged(shell, file, settings),
    handleFileRenamed: (shell, file, oldPath, settings) =>
      indexer.onFileRenamed(shell, file, oldPath, settings),
    handleFileDeleted: (path) => indexer.onFileDeleted(path),
    dispose: () => indexer.dispose(),
  };
}

export function createTagIndexExtension(
  appId: string,
  options: TagIndexerOptions = {},
): TagIndexExtension {
  return adaptTagIndexer(new TagIndexer(appId, options));
}
