import { adaptTagIndexer } from "src/extensions/tag-index-extension";
import { describe, expect, it, vi } from "vitest";

describe("tag index extension adapter", () => {
  it("delegates all lifecycle methods to the underlying indexer", async () => {
    const indexer = {
      scanAllNotes: vi.fn(async () => {}),
      onFileChanged: vi.fn(async () => {}),
      onFileRenamed: vi.fn(async () => {}),
      onFileDeleted: vi.fn(async () => {}),
      dispose: vi.fn(async () => {}),
    };
    const extension = adaptTagIndexer(indexer as any);
    const shell = {} as any;
    const file = { path: "daily/2026-03-15.md" } as any;
    const settings = { topics: [] } as any;

    await extension.fullScan(shell, settings);
    await extension.handleFileChanged(shell, file, settings);
    await extension.handleFileRenamed(shell, file, "old.md", settings);
    await extension.handleFileDeleted(file.path);
    await extension.dispose();

    expect(indexer.scanAllNotes).toHaveBeenCalledWith(shell, settings);
    expect(indexer.onFileChanged).toHaveBeenCalledWith(shell, file, settings);
    expect(indexer.onFileRenamed).toHaveBeenCalledWith(shell, file, "old.md", settings);
    expect(indexer.onFileDeleted).toHaveBeenCalledWith(file.path);
    expect(indexer.dispose).toHaveBeenCalledTimes(1);
  });
});
