import type { ObsidianAPI } from "obsidian-e2e-toolkit";
import { expect, test } from "obsidian-e2e-toolkit";
import { DSTR_VIEW_TYPE, dstrVaultOptions, openHostNote } from "./support";

const HOST_FILE_PATH = "dstr-e2e-fixed-delete-host.md";
const NEXT_FILE_PATH = "dstr-e2e-fixed-delete-next.md";
const FIXED_NOTE_PATH = "dstr/DeleteTarget.dstr.md";

test.use({ vaultOptions: dstrVaultOptions() });

async function ensureFixedNoteFixture(obsidian: ObsidianAPI) {
  await obsidian.evaluateApp(async () => {
    if (!app.vault.getAbstractFileByPath("dstr")) {
      await app.vault.createFolder("dstr");
    }
  });
  await obsidian.save(FIXED_NOTE_PATH, "## Thino session 1\n- 09:00:00 delete-target\n");
}

/** Opens a file in the most recent leaf, so the previous file stays in that leaf's history. */
async function openInSameLeaf(obsidian: ObsidianAPI, filePath: string) {
  await obsidian.evaluateApp(async (path) => {
    const file = app.vault.getFileByPath(path);
    if (!file) throw new Error(`file not found: ${path}`);
    await app.workspace.getMostRecentLeaf()!.openFile(file);
  }, filePath);
}

/** Lists the file of every back/forward history entry across all leaves. */
function getHistoryFiles(obsidian: ObsidianAPI) {
  return obsidian.evaluateApp(() => {
    const files: unknown[] = [];
    app.workspace.iterateAllLeaves((leaf) => {
      // 意図: leaf.history は非公開APIのため、型を緩めて中身だけ読む。
      const history = (leaf as unknown as { history?: Record<string, unknown> }).history;
      for (const key of ["backHistory", "forwardHistory"]) {
        const entries = history?.[key];
        if (!Array.isArray(entries)) continue;
        for (const entry of entries) files.push(entry?.state?.state?.file);
      }
    });
    return files;
  });
}

test.describe("fixed note delete", () => {
  test("削除した固定ノートを戻る/進む履歴に残さない", async ({ obsidian }) => {
    await openHostNote(obsidian, HOST_FILE_PATH);
    await ensureFixedNoteFixture(obsidian);
    await obsidian.createNote(NEXT_FILE_PATH, "");

    // 同じ leaf で host → 固定ノート → next と開き、固定ノートを戻る履歴へ積む
    await openInSameLeaf(obsidian, FIXED_NOTE_PATH);
    await obsidian.waitForViewType(DSTR_VIEW_TYPE);
    await openInSameLeaf(obsidian, NEXT_FILE_PATH);
    await expect.poll(() => getHistoryFiles(obsidian)).toContain(FIXED_NOTE_PATH);

    await obsidian.evaluateApp(async (path) => {
      await app.fileManager.trashFile(app.vault.getFileByPath(path)!);
    }, FIXED_NOTE_PATH);

    await expect.poll(() => getHistoryFiles(obsidian)).not.toContain(FIXED_NOTE_PATH);
  });

  test("削除した固定ノートを表示中のタブは空タブになる", async ({ obsidian }) => {
    await openHostNote(obsidian, HOST_FILE_PATH);
    await ensureFixedNoteFixture(obsidian);

    await openInSameLeaf(obsidian, FIXED_NOTE_PATH);
    await obsidian.waitForViewType(DSTR_VIEW_TYPE);

    await obsidian.evaluateApp(async (path) => {
      await app.fileManager.trashFile(app.vault.getFileByPath(path)!);
    }, FIXED_NOTE_PATH);

    await expect
      .poll(() => obsidian.evaluateApp(() => app.workspace.getLeavesOfType("dstr-view").length))
      .toBe(0);
    await expect.poll(() => getHistoryFiles(obsidian)).not.toContain(FIXED_NOTE_PATH);
  });
});
