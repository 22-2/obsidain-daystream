import type { ObsidianAPI } from "obsidian-e2e-toolkit";
import { expect, test } from "obsidian-e2e-toolkit";
import type { DSTRView } from "src/features/workspace/views/DSTRView";
import {
  DSTR_VIEW_TYPE,
  LIVE_EDITOR,
  dstrVaultOptions,
  getLiveEditorDelegateContent,
  openHostNote,
  setLiveEditorDelegateContent,
} from "./support";

const HOST_FILE_PATH = "dstr-e2e-fixed-rename-host.md";
const OLD_PATH = "dstr/RenameBefore.dstr.md";
const NEW_PATH = "dstr/RenameAfter.dstr.md";

test.use({ vaultOptions: dstrVaultOptions() });

async function ensureFixedNoteFixture(obsidian: ObsidianAPI) {
  await obsidian.evaluateApp(async () => {
    if (!window.app.vault.getAbstractFileByPath("dstr")) {
      await window.app.vault.createFolder("dstr");
    }
  });
  await obsidian.save(OLD_PATH, "## Thino session 1\n- 09:00:00 rename-target\n");
}

async function openFixedNoteView(obsidian: ObsidianAPI) {
  await obsidian.openView(
    DSTR_VIEW_TYPE,
    { noteMode: "fixed", file: OLD_PATH, fixedSessionNumber: 1 },
    { newLeaf: true },
  );
  await obsidian.waitForViewType(DSTR_VIEW_TYPE);
  // 意図: 2つ目のタブを開くと先に開いたタブの入力欄は裏に回るため、前面の入力欄を待つ。
  await expect(obsidian.page.locator(LIVE_EDITOR).filter({ visible: true })).toBeVisible({
    timeout: 15000,
  });
}

function renameFixedNote(obsidian: ObsidianAPI) {
  return obsidian.evaluateApp(
    async ([from, to]) => {
      const file = window.app.vault.getFileByPath(from);
      if (!file) throw new Error(`file not found: ${from}`);
      await window.app.fileManager.renameFile(file, to);
    },
    [OLD_PATH, NEW_PATH] as const,
  );
}

/** Reads the file shown by every Daystream leaf. */
function getDSTRLeafFiles(obsidian: ObsidianAPI) {
  return obsidian.evaluateApp(() =>
    window.app.workspace
      .getLeavesOfType("dstr-view")
      .map((leaf) => (leaf.getViewState().state as { file?: unknown } | undefined)?.file ?? null),
  );
}

function getListText(obsidian: ObsidianAPI) {
  return obsidian.evaluateApp(() => document.querySelector(".list")?.textContent ?? "");
}

test.describe("fixed note rename", () => {
  test("外から名前を変えても、開いているビューは新しいノートを表示して投稿も新しいノートへ入れる", async ({
    obsidian,
  }) => {
    await openHostNote(obsidian, HOST_FILE_PATH);
    await ensureFixedNoteFixture(obsidian);
    await openFixedNoteView(obsidian);
    await expect.poll(() => getListText(obsidian)).toContain("rename-target");
    await setLiveEditorDelegateContent(obsidian, "draft-before-rename");

    await renameFixedNote(obsidian);

    await expect.poll(() => getDSTRLeafFiles(obsidian)).toEqual([NEW_PATH]);
    await expect.poll(() => getListText(obsidian)).toContain("rename-target");
    // 入力中の本文は名前変更で失われない。
    expect(await getLiveEditorDelegateContent(obsidian)).toBe("draft-before-rename");

    await setLiveEditorDelegateContent(obsidian, "posted-after-rename");
    await obsidian.evaluateApp(async () => {
      const leaf = window.app.workspace.getLeavesOfType("dstr-view")[0];
      await (leaf?.view as DSTRView | undefined)?.actionDelegates.onSubmit?.();
    });

    await expect
      .poll(() =>
        obsidian.evaluateApp(async (path) => {
          const file = window.app.vault.getFileByPath(path);
          return file ? await window.app.vault.read(file) : "";
        }, NEW_PATH),
      )
      .toContain("posted-after-rename");
    // 古いパスのノートを作り直さない。
    expect(
      await obsidian.evaluateApp((path) => window.app.vault.getAbstractFileByPath(path) !== null, OLD_PATH),
    ).toBe(false);
  });

  test("同じ固定ノートを開いた複数のタブがすべて新しいパスへ追従する", async ({ obsidian }) => {
    await openHostNote(obsidian, HOST_FILE_PATH);
    await ensureFixedNoteFixture(obsidian);
    await openFixedNoteView(obsidian);
    await openFixedNoteView(obsidian);
    await expect.poll(() => getDSTRLeafFiles(obsidian)).toEqual([OLD_PATH, OLD_PATH]);

    await renameFixedNote(obsidian);

    await expect.poll(() => getDSTRLeafFiles(obsidian)).toEqual([NEW_PATH, NEW_PATH]);
  });
});
