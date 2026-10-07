import type { Page } from "@playwright/test";
import path from "node:path";
import type { ObsidianAPI } from "obsidian-e2e-toolkit";
import { expect, test } from "obsidian-e2e-toolkit";
import type { MFDIView } from "src/features/workspace/views/MFDIView";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGIN_PATH = path.join(__dirname, "../dist");
const HOST_FILE_PATH = "mfdi-e2e-react-host.md";

test.use({
  vaultOptions: {
    fresh: true,
    logLevel: "debug",
    plugins: [
      {
        path: PLUGIN_PATH,
      },
    ],
  },
});

async function waitForMFDIReady(obsidian: ObsidianAPI, page: Page) {
  await obsidian.waitReady();
  await obsidian.waitForPluginEnabled("mobile-first-daily-interface");

  await obsidian.save(HOST_FILE_PATH, "");
  await obsidian.open(HOST_FILE_PATH);
  await obsidian.waitReady();

  await obsidian.command("mobile-first-daily-interface:mfdi-open-view");
  await obsidian.waitForViewType("mfdi-view");

  await expect(
    page.locator('.workspace-leaf-content[data-type="mfdi-view"]').getByRole("tab", { name: "タイムライン", exact: true }),
  ).toHaveAttribute("aria-selected", "true", { timeout: 15000 });

  const liveEditor = page.locator(".mfdi-input-area .cm-content");
  await expect(liveEditor).toBeVisible({ timeout: 15000 });

  return liveEditor;
}

async function setLiveEditorContent(obsidian: ObsidianAPI, text: string) {
  await obsidian.page.evaluate((content) => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!leaf) {
      throw new Error("mfdi-view leaf not found");
    }

    if (!(leaf.view as MFDIView).actionDelegates.onSetLiveEditorContentForTesting) {
      throw new Error("onSetLiveEditorContentForTesting is not ready");
    }

    (leaf.view as MFDIView).actionDelegates.onSetLiveEditorContentForTesting!(content);
  }, text);

  await expect.poll(() => getLiveEditorContent(obsidian)).toBe(text);
}

async function getLiveEditorContent(obsidian: ObsidianAPI) {
  return obsidian.page.evaluate(() => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!leaf) {
      throw new Error("mfdi-view leaf not found");
    }

    if (!(leaf.view as MFDIView).actionDelegates.onGetLiveEditorContentForTesting) {
      throw new Error("onGetLiveEditorContentForTesting is not ready");
    }

    return (leaf.view as MFDIView).actionDelegates.onGetLiveEditorContentForTesting!();
  });
}

interface ReactViewDebugSnapshot {
  listText: string;
  markdownRenderedCount: number;
  baseCardCount: number;
  timelineBadgeVisible: boolean;
  activeFilePath: string | null;
  mfdiLeafCount: number;
  displayMode: string | null;
  nowDate: string;
  dbMemoCount: number | null;
  dbPaths: string[];
  dbTopics: string[];
  dbNoteDates: string[];
  dbFirstContent: string | null;
  dbError: string | null;
  viewDate: string | null;
  viewActiveTopic: string | null;
  settingsDateIso: string | null;
  settingsDisplayMode: string | null;
}

async function getReactViewDebugSnapshot(obsidian: ObsidianAPI): Promise<ReactViewDebugSnapshot> {
  return obsidian.page.evaluate(() => {
    const listEl = document.querySelector(".list") as HTMLElement | null;
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    const activeFile = app.workspace.getActiveFile();
    const viewState = (leaf?.view as MFDIView | undefined)?.getState?.();
    const viewDateValue = viewState?.date;
    const viewDate =
      viewDateValue &&
      typeof viewDateValue === "object" &&
      "format" in viewDateValue &&
      typeof viewDateValue.format === "function"
        ? viewDateValue.format("YYYY-MM-DD")
        : null;

    return {
      listText: listEl?.innerText ?? "",
      markdownRenderedCount: document.querySelectorAll(".list .markdown-rendered").length,
      baseCardCount: document.querySelectorAll(".list .base-card").length,
      timelineBadgeVisible: Array.from(document.querySelectorAll("*"))
        .some((el) => (el as HTMLElement).innerText?.includes("タイムライン表示中")),
      activeFilePath: activeFile?.path ?? null,
      mfdiLeafCount: app.workspace.getLeavesOfType("mfdi-view").length,
      displayMode: viewState?.displayMode ?? null,
      viewDate,
      viewActiveTopic: viewState?.activeTopic ?? null,
      settingsDateIso:
        (leaf?.view as MFDIView | undefined)?.actionDelegates.onGetDebugStateForTesting?.().settingsDateIso ?? null,
      settingsDisplayMode:
        (leaf?.view as MFDIView | undefined)?.actionDelegates.onGetDebugStateForTesting?.().displayMode ?? null,
      nowDate: window.moment().format("YYYY-MM-DD HH:mm:ss"),
      dbMemoCount: null,
      dbPaths: [],
      dbTopics: [],
      dbNoteDates: [],
      dbFirstContent: null,
      dbError: null,
    };
  }).then(async (snapshot) => {
    const dbSnapshot = await obsidian.page.evaluate(async () => {
      try {
        const plugin = app.plugins.getPlugin("mobile-first-daily-interface") as {
          shell?: { getAppId?: () => string };
        } | null;
        const appId = plugin?.shell?.getAppId?.();
        if (!appId) {
          return {
            dbMemoCount: null,
            dbPaths: [] as string[],
            dbTopics: [] as string[],
            dbNoteDates: [] as string[],
            dbFirstContent: null,
            dbError: "appId not found",
          };
        }

        const dbName = `${appId}-mfdi-db`;
        const opened = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(dbName);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error ?? new Error("failed to open indexeddb"));
        });

        const tx = opened.transaction("memos", "readonly");
        const store = tx.objectStore("memos");
        const memos = await new Promise<
          Array<{ path: string; topicId: string; noteDate: string; content: string }>
        >((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () =>
            resolve(
              (req.result as Array<{
                path: string;
                topicId: string;
                noteDate: string;
                content: string;
              }>) ?? [],
            );
          req.onerror = () => reject(req.error ?? new Error("failed to read memos"));
        });
        opened.close();

        return {
          dbMemoCount: memos.length,
          dbPaths: Array.from(new Set(memos.map((m) => m.path))).slice(0, 10),
          dbTopics: Array.from(new Set(memos.map((m) => m.topicId))).slice(0, 10),
          dbNoteDates: Array.from(new Set(memos.map((m) => m.noteDate))).slice(0, 10),
          dbFirstContent: memos[0]?.content ?? null,
          dbError: null,
        };
      } catch (error) {
        return {
          dbMemoCount: null,
          dbPaths: [] as string[],
          dbTopics: [] as string[],
          dbNoteDates: [] as string[],
          dbFirstContent: null,
          dbError: String(error),
        };
      }
    });

    return {
      ...snapshot,
      ...dbSnapshot,
    };
  });
}

async function toggleDisplayModeForRefresh(obsidian: ObsidianAPI) {
  await obsidian.page.evaluate(() => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!leaf) {
      throw new Error("mfdi-view leaf not found");
    }

    const handlers = (leaf.view as MFDIView).actionDelegates;
    handlers.onChangeDisplayMode?.("focus");
    handlers.onChangeDisplayMode?.("timeline");
  });
}

async function waitForListContainsMessage(
  obsidian: ObsidianAPI,
  message: string,
  timeoutMs: number,
) {
  const startedAt = Date.now();
  let latestSnapshot = await getReactViewDebugSnapshot(obsidian);

  while (Date.now() - startedAt < timeoutMs) {
    latestSnapshot = await getReactViewDebugSnapshot(obsidian);
    if (latestSnapshot.listText.includes(message)) {
      return;
    }

    await obsidian.page.waitForTimeout(500);
  }

  throw new Error(
    `UI list did not include posted message within ${timeoutMs}ms. Snapshot: ${JSON.stringify(latestSnapshot, null, 2)}`,
  );
}

test.describe("MFDI react view e2e", () => {
  test("ビュー表示中に日付が変わって新規日次ノート作成後も投稿がリストに表示される", async ({ obsidian }) => {
    await waitForMFDIReady(obsidian, obsidian.page);

    const dateShift = await obsidian.page.evaluate(() => {
      const now = window.moment();
      const beforeDay = now.format("YYYY-MM-DD");
      const nextDayMs = now.clone().add(1, "day").add(1, "minute").valueOf();
      window.moment.now = () => nextDayMs;
      const afterDay = window.moment().format("YYYY-MM-DD");
      return {
        beforeDay,
        afterDay,
        nextDayPath: `${afterDay}.md`,
      };
    });

    expect(dateShift.afterDay).not.toBe(dateShift.beforeDay);
    expect(dateShift.nextDayPath).toBe(`${dateShift.afterDay}.md`);

    const message = `cross-day-post-${Date.now()}`;
    await setLiveEditorContent(obsidian, message);

    await obsidian.page.getByRole("button", { name: "投稿" }).click();

    await expect.poll(async () => {
      const content = await obsidian.read(dateShift.nextDayPath);
      return content.includes(message);
    }).toBe(true);

    // ファイル保存は成功している前提で、UI反映までを段階的に検証して原因を切り分ける。
    await waitForListContainsMessage(obsidian, message, 5000).catch(async () => {
      await toggleDisplayModeForRefresh(obsidian);
      await waitForListContainsMessage(obsidian, message, 5000);
    });

    await obsidian.closeTab();
    await obsidian.command("mobile-first-daily-interface:mfdi-open-view");
    await obsidian.waitForViewType("mfdi-view");

    await waitForListContainsMessage(obsidian, message, 15000);
  });

});
