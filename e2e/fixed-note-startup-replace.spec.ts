import type { ObsidianAPI } from "obsidian-e2e-toolkit";
import { expect, test } from "obsidian-e2e-toolkit";
import { DSTR_VIEW_TYPE, dstrVaultOptions, openHostNote } from "./support";

const HOST_FILE_PATH = "dstr-e2e-startup-host.md";
const FIXED_NOTE_PATHS = ["dstr/StartupA.dstr.md", "dstr/StartupB.dstr.md"];

test.use({ vaultOptions: dstrVaultOptions() });

async function ensureFixedNoteFixtures(obsidian: ObsidianAPI) {
  await obsidian.evaluateApp(async () => {
    if (!window.app.vault.getAbstractFileByPath("dstr")) {
      await window.app.vault.createFolder("dstr");
    }
  });
  for (const path of FIXED_NOTE_PATHS) {
    await obsidian.save(path, `## Thino session 1\n- 09:00:00 ${path}\n`);
  }
}

/** Opens each fixed note as a plain Markdown tab, as "Markdown で開く" does. */
async function openFixedNotesAsMarkdown(obsidian: ObsidianAPI) {
  await obsidian.evaluateApp(async (paths) => {
    for (const path of paths) {
      const leaf = window.app.workspace.getLeaf("tab");
      await leaf.setViewState({
        type: "markdown",
        state: { file: path, __dstr_force_markdown: true },
      });
    }
  }, FIXED_NOTE_PATHS);
}

/** Makes the host note the active tab again. */
async function activateHostNote(obsidian: ObsidianAPI) {
  await obsidian.evaluateApp((path) => {
    const leaf = window.app.workspace
      .getLeavesOfType("markdown")
      .find((candidate) => candidate.getViewState().state?.file === path);
    if (!leaf) throw new Error(`host leaf not found: ${path}`);
    window.app.workspace.setActiveLeaf(leaf, { focus: true });
  }, HOST_FILE_PATH);
}

function getActiveLeafFile(obsidian: ObsidianAPI) {
  return obsidian.evaluateApp(
    () => window.app.workspace.getMostRecentLeaf()?.getViewState().state?.file ?? null,
  );
}

/** Lists the view type and file of every leaf that shows one of the fixed notes. */
function getFixedNoteLeaves(obsidian: ObsidianAPI) {
  return obsidian.evaluateApp((paths) => {
    const result: Array<{ type: string; file: unknown }> = [];
    // 意図: バックリンクやアウトラインなどサイドバーの leaf も同じ file を持つため、本文のタブだけを見る。
    window.app.workspace.iterateRootLeaves((leaf) => {
      const viewState = leaf.getViewState();
      const file = viewState.state?.file;
      if (typeof file === "string" && paths.includes(file)) {
        result.push({ type: viewState.type, file });
      }
    });
    return result.sort((a, b) => String(a.file).localeCompare(String(b.file)));
  }, FIXED_NOTE_PATHS);
}

test.describe("fixed note startup replace", () => {
  test("再起動後も前面のタブを奪わず、固定ノートのタブは開くと Daystream ビューになる", async ({
    obsidian,
  }) => {
    await openHostNote(obsidian, HOST_FILE_PATH);
    await ensureFixedNoteFixtures(obsidian);
    await openFixedNotesAsMarkdown(obsidian);
    // 「Markdown で開く」はその場では Markdown ビューのまま開く。
    await expect
      .poll(() => getFixedNoteLeaves(obsidian))
      .toEqual(FIXED_NOTE_PATHS.map((file) => ({ type: "markdown", file })));
    await activateHostNote(obsidian);
    await expect.poll(() => getActiveLeafFile(obsidian)).toBe(HOST_FILE_PATH);

    await obsidian.reload({ saveLayout: true });

    // 起動時の置き換えで、裏の固定ノートのタブが前面に出てこない。
    await expect.poll(() => getActiveLeafFile(obsidian)).toBe(HOST_FILE_PATH);
    await obsidian.page.waitForTimeout(500);
    expect(await getActiveLeafFile(obsidian)).toBe(HOST_FILE_PATH);

    // 裏のタブも、前面に出せば Daystream ビューとして表示される。
    for (const path of FIXED_NOTE_PATHS) {
      await obsidian.evaluateApp(async (file) => {
        let target: import("obsidian").WorkspaceLeaf | null = null;
        window.app.workspace.iterateAllLeaves((leaf) => {
          if (leaf.getViewState().state?.file === file) target = leaf;
        });
        if (!target) throw new Error(`leaf not found: ${file}`);
        await window.app.workspace.revealLeaf(target);
      }, path);
    }
    await expect
      .poll(() => getFixedNoteLeaves(obsidian))
      .toEqual(FIXED_NOTE_PATHS.map((file) => ({ type: DSTR_VIEW_TYPE, file })));
  });
});
