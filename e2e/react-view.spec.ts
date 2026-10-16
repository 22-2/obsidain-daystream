import type { ObsidianAPI } from "obsidian-e2e-toolkit";
import { expect, test } from "obsidian-e2e-toolkit";
import type { DaystreamView } from "src/features/workspace/views/DaystreamView";
import {
  LIVE_EDITOR,
  daystreamVaultOptions,
  openHostNote,
  openDaystreamView,
  setLiveEditorDelegateContent,
} from "./support";

const HOST_FILE_PATH = "daystream-e2e-react-host.md";

test.use({ vaultOptions: daystreamVaultOptions({ logLevel: "debug" }) });

async function waitForDaystreamReady(obsidian: ObsidianAPI) {
  await openHostNote(obsidian, HOST_FILE_PATH);
  const view = await openDaystreamView(obsidian);
  await expect(
    view.getByRole("tab", { name: "タイムライン", exact: true }),
  ).toHaveAttribute("aria-selected", "true", { timeout: 15000 });
  await expect(obsidian.page.locator(LIVE_EDITOR)).toBeVisible({
    timeout: 15000,
  });
}

interface MemoDatabaseSnapshot {
  dbMemoCount: number | null;
  dbPaths: string[];
  dbTopics: string[];
  dbNoteDates: string[];
  dbFirstContent: string | null;
  dbError: string | null;
}

interface ReactViewDebugSnapshot extends MemoDatabaseSnapshot {
  listText: string;
  markdownRenderedCount: number;
  baseCardCount: number;
  timelineBadgeVisible: boolean;
  activeFilePath: string | null;
  daystreamLeafCount: number;
  displayMode: string | null;
  nowDate: string;
  viewDate: string | null;
  viewActiveTopic: string | null;
  settingsDateIso: string | null;
  settingsDisplayMode: string | null;
}

/** Reads the view state and the list DOM in one evaluation, so both describe the same moment. */
async function getReactViewViewState(obsidian: ObsidianAPI) {
  return obsidian.evaluateApp(() => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    const activeFile = app.workspace.getActiveFile();
    const viewState = (leaf?.view as DaystreamView | undefined)?.getState?.();
    const viewDateValue = viewState?.date;
    const viewDate =
      viewDateValue &&
      typeof viewDateValue === "object" &&
      "format" in viewDateValue &&
      typeof viewDateValue.format === "function"
        ? viewDateValue.format("YYYY-MM-DD")
        : null;
    const debugState = (leaf?.view as DaystreamView | undefined)?.actionDelegates.onGetDebugStateForTesting?.();
    const listEl = document.querySelector(".list") as HTMLElement | null;

    return {
      activeFilePath: activeFile?.path ?? null,
      daystreamLeafCount: app.workspace.getLeavesOfType("mfdi-view").length,
      displayMode: viewState?.displayMode ?? null,
      viewDate,
      viewActiveTopic: viewState?.activeTopic ?? null,
      settingsDateIso: debugState?.settingsDateIso ?? null,
      settingsDisplayMode: debugState?.displayMode ?? null,
      nowDate: window.moment().format("YYYY-MM-DD HH:mm:ss"),
      listText: listEl?.innerText ?? "",
      markdownRenderedCount: document.querySelectorAll(".list .markdown-rendered").length,
      baseCardCount: document.querySelectorAll(".list .base-card").length,
      timelineBadgeVisible: Array.from(document.querySelectorAll("*")).some((el) =>
        (el as HTMLElement).innerText?.includes("タイムライン表示中"),
      ),
    };
  });
}

/** Reads the memo rows that the view stores in IndexedDB. The database name comes from the app id. */
async function getMemoDatabaseState(obsidian: ObsidianAPI): Promise<MemoDatabaseSnapshot> {
  const appId = await obsidian.evaluateApp(() => {
    const plugin = app.plugins.getPlugin("daystream") as {
      shell?: { getAppId?: () => string };
    } | null;
    return plugin?.shell?.getAppId?.() ?? null;
  });
  return obsidian.page.evaluate(async (currentAppId) => {
    const empty = {
      dbMemoCount: null,
      dbPaths: [] as string[],
      dbTopics: [] as string[],
      dbNoteDates: [] as string[],
      dbFirstContent: null,
    };
    if (!currentAppId) {
      return { ...empty, dbError: "appId not found" };
    }

    try {
      const dbName = `${currentAppId}-mfdi-db`;
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
      return { ...empty, dbError: String(error) };
    }
  }, appId);
}

/** Full diagnostics, collected only when a wait has already failed. */
async function getReactViewDebugSnapshot(obsidian: ObsidianAPI): Promise<ReactViewDebugSnapshot> {
  const viewState = await getReactViewViewState(obsidian);
  const memoState = await getMemoDatabaseState(obsidian);
  return { ...viewState, ...memoState };
}

/** The only value polled while waiting: the list's visible text. */
function readListText(obsidian: ObsidianAPI): Promise<string> {
  return obsidian.page.evaluate(
    () => (document.querySelector(".list") as HTMLElement | null)?.innerText ?? "",
  );
}

/** Waits until the UI list shows the message. Diagnostics are collected only after a timeout. */
async function expectListContainsMessage(obsidian: ObsidianAPI, message: string, timeout: number) {
  await expect
    .poll(() => readListText(obsidian), { timeout })
    .toContain(message)
    .catch(async (error: unknown) => {
      const snapshot = await getReactViewDebugSnapshot(obsidian);
      throw new Error(
        `UI list did not include posted message within ${timeout}ms. Snapshot: ${JSON.stringify(snapshot, null, 2)}`,
        { cause: error },
      );
    });
}

test.describe("Daystream react view e2e", () => {
  test("ビュー表示中に日付が変わって新規日次ノート作成後も投稿がリストに表示される", async ({ obsidian }) => {
    await waitForDaystreamReady(obsidian);

    const dateShift = await obsidian.evaluateApp(() => {
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
    expect(dateShift.nextDayPath).toBe(dateShift.afterDay + ".md");

    const message = "cross-day-post-" + Date.now();
    await setLiveEditorDelegateContent(obsidian, message);

    await obsidian.page.getByRole("button", { name: "投稿" }).click();

    await expect
      .poll(async () => {
        const content = await obsidian.read(dateShift.nextDayPath);
        return content.includes(message);
      })
      .toBe(true);

    // 意図: 保存後の一覧反映を待つ。再描画を促す操作で通すことはしない。
    // ここで失敗する場合は、日付変更後のビューの反映漏れとして扱う。
    await expectListContainsMessage(obsidian, message, 15000);

    await obsidian.closeTab();
    await openDaystreamView(obsidian);

    await expectListContainsMessage(obsidian, message, 15000);
  });
});
