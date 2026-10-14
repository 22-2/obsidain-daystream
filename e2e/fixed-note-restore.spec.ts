import type { ObsidianAPI } from "obsidian-e2e-toolkit";
import { expect, test } from "obsidian-e2e-toolkit";
import {
  LIVE_EDITOR,
  MFDI_VIEW_TYPE,
  mfdiVaultOptions,
  openHostNote,
} from "./support";

const HOST_FILE_PATH = "mfdi-e2e-fixed-restore-host.md";
const FIXED_NOTE_PATH = "MFDI/RestoreTarget.mfdi.md";

test.use({ vaultOptions: mfdiVaultOptions({ logLevel: "debug" }) });

async function waitForPluginReady(obsidian: ObsidianAPI) {
  await openHostNote(obsidian, HOST_FILE_PATH);
  await expect(obsidian.page.locator(".workspace-tabs.mod-active").first()).toBeVisible({
    timeout: 15000,
  });
}

async function ensureFixedNoteFixture(obsidian: ObsidianAPI) {
  await obsidian.evaluateApp(async () => {
    if (!app.vault.getAbstractFileByPath("MFDI")) {
      await app.vault.createFolder("MFDI");
    }
  });

  await obsidian.save(
    FIXED_NOTE_PATH,
    [
      "## Thino session 1",
      "- 09:00:00 session-one [mfdiId::session-1]",
      "",
      "## Thino session 2",
      "- 10:00:00 session-two [mfdiId::session-2]",
      "",
    ].join("\n"),
  );
}

async function openFixedNoteView(obsidian: ObsidianAPI, sessionNumber: number) {
  await obsidian.openView(
    MFDI_VIEW_TYPE,
    {
      displayMode: "focus",
      granularity: "day",
      asTask: false,
      threadOnly: false,
      fixedSessionNumber: sessionNumber,
      timeFilter: "all",
      dateFilter: "all",
      searchQuery: "",
      activeTopic: "",
      noteMode: "fixed",
      file: FIXED_NOTE_PATH,
    },
    { newLeaf: true },
  );

  await obsidian.waitForViewType(MFDI_VIEW_TYPE);
  await expect(obsidian.page.locator(LIVE_EDITOR)).toBeVisible({
    timeout: 15000,
  });
}

async function reopenCurrentMFDILeaf(obsidian: ObsidianAPI) {
  await obsidian.evaluateApp(async () => {
    const currentLeaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!currentLeaf) {
      throw new Error("mfdi-view leaf not found");
    }

    const currentState = currentLeaf.view.getState();
    currentLeaf.detach();

    const nextLeaf = app.workspace.getLeaf(true);
    await nextLeaf.setViewState({
      type: "mfdi-view",
      active: true,
      state: currentState,
    });
    app.workspace.revealLeaf(nextLeaf);
  });
}

/** Reloads the window, then shows the restored MFDI view as a user opening its tab would. */
async function reloadAndRevealMFDIView(obsidian: ObsidianAPI) {
  // 意図: reload は既定で saveLayout の完了を待つため、遅延保存で配置を失わない。
  await obsidian.reload({ saveLayout: true });

  // 意図: 再読込直後は固定ノートの leaf 復元（markdown から mfdi-view への変換）が
  // 終わっていないことがあるため、leaf が現れるまで待つ。
  await expect
    .poll(() => obsidian.evaluateApp(() => app.workspace.getLeavesOfType("mfdi-view").length), {
      timeout: 15000,
    })
    .toBeGreaterThan(0)
    .catch(async (error: unknown) => {
      throw new Error(
        `mfdi-view leaf was not restored. Leaves:\n${await obsidian.describeLeaves()}`,
        { cause: error },
      );
    });

  // 意図: 再読込後の Obsidian は前面にないタブのビューを遅延読み込みにするため、
  // ユーザーがタブを開くのと同じく MFDI タブを前面に出して描画させる。
  await obsidian.revealView(MFDI_VIEW_TYPE);
}

async function getFixedSessionSnapshot(obsidian: ObsidianAPI) {
  // One evaluation reads the view state and the list text together, so both describe the same moment.
  return obsidian.evaluateApp(() => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!leaf) {
      throw new Error("mfdi-view leaf not found");
    }

    const viewState = leaf.view.getState() as {
      fixedSessionNumber?: number;
      noteMode?: string;
      file?: string | null;
    };
    const listText = document.querySelector(".list")?.textContent ?? "";

    return {
      fixedSessionNumber: viewState.fixedSessionNumber ?? null,
      noteMode: viewState.noteMode ?? null,
      file: viewState.file ?? null,
      listText,
    };
  });
}

test.describe("fixed note restore", () => {
  test("repeated session switching does not bounce between stale states", async ({
    obsidian,
  }) => {
    await waitForPluginReady(obsidian);
    await ensureFixedNoteFixture(obsidian);
    await openFixedNoteView(obsidian, 1);

    const sessionOne = obsidian.page.getByText("Session 1", { exact: true });
    const sessionTwo = obsidian.page.getByText("Session 2", { exact: true });
    await expect(sessionOne).toBeVisible();
    await expect(sessionTwo).toBeVisible();

    for (let index = 0; index < 6; index += 1) {
      await sessionTwo.click();
      await sessionOne.click();
    }
    await sessionTwo.click();

    await expect.poll(async () => {
      return await getFixedSessionSnapshot(obsidian);
    }).toMatchObject({
      fixedSessionNumber: 2,
      noteMode: "fixed",
      file: FIXED_NOTE_PATH,
    });
    await expect.poll(async () => {
      return (await getFixedSessionSnapshot(obsidian)).listText;
    }).toContain("session-two");

    // 観測期間: 競合が一度収まった後も再発しないことを、少し時間を置いて確認する。
    await obsidian.page.waitForTimeout(300);
    expect((await getFixedSessionSnapshot(obsidian)).fixedSessionNumber).toBe(2);
  });

  test("restored fixed leaf keeps session selection and stays responsive", async ({
    obsidian,
  }) => {
    await waitForPluginReady(obsidian);
    await ensureFixedNoteFixture(obsidian);
    await openFixedNoteView(obsidian, 2);

    await expect.poll(async () => {
      return (await getFixedSessionSnapshot(obsidian)).fixedSessionNumber;
    }).toBe(2);

    await expect.poll(async () => {
      return (await getFixedSessionSnapshot(obsidian)).listText;
    }).toContain("session-two");

    await reopenCurrentMFDILeaf(obsidian);

    await expect(obsidian.page.locator(LIVE_EDITOR)).toBeVisible({
      timeout: 15000,
    });
    await expect.poll(async () => {
      return await getFixedSessionSnapshot(obsidian);
    }).toMatchObject({
      fixedSessionNumber: 2,
      noteMode: "fixed",
      file: FIXED_NOTE_PATH,
    });

    await expect.poll(async () => {
      return (await getFixedSessionSnapshot(obsidian)).listText;
    }).toContain("session-two");
  });

  test("reloading the window keeps the restored fixed session responsive", async ({
    obsidian,
  }) => {
    await waitForPluginReady(obsidian);
    await ensureFixedNoteFixture(obsidian);
    await openFixedNoteView(obsidian, 2);

    await expect.poll(async () => {
      return (await getFixedSessionSnapshot(obsidian)).fixedSessionNumber;
    }).toBe(2);

    await reloadAndRevealMFDIView(obsidian);

    await expect(
      obsidian.page.locator(LIVE_EDITOR),
      await obsidian.describeLeaves(),
    ).toBeVisible({
      timeout: 15000,
    });
    await expect.poll(async () => {
      return await getFixedSessionSnapshot(obsidian);
    }).toMatchObject({
      fixedSessionNumber: 2,
      noteMode: "fixed",
      file: FIXED_NOTE_PATH,
    });

    await expect.poll(async () => {
      return (await getFixedSessionSnapshot(obsidian)).listText;
    }).toContain("session-two");
  });
});
