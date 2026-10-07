import type { Locator, Page } from "@playwright/test";
import path from "node:path";
import type { ObsidianAPI } from "obsidian-e2e-toolkit";
import { expect, test } from "obsidian-e2e-toolkit";
import { createStorageKey, getStorageKeyPrefix } from "src/core/storage";
import { STORAGE_KEYS } from "src/features/workspace/config/constants";
import { getInputStorageKey } from "src/features/composer/store/slices/inputStorage";
import type { MFDIView } from "src/features/workspace/views/MFDIView";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CI/build places plugin output at repository root `dist/`.
// Use parent path so e2e tests find the built plugin in CI.
const PLUGIN_PATH = path.join(__dirname, "../dist");
const HOST_FILE_PATH = "mfdi-e2e-host.md";

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

  const liveEditor = page.locator(".mfdi-input-area .cm-content");

  await expect(liveEditor).toBeVisible({ timeout: 15000 });
  return liveEditor;
}

async function openModalFromKeyboard(page: Page) {
  await page.keyboard.press("Control+Shift+Alt+O");
  const modalEditor = page.locator(".mfdi-modal-editor .cm-content");
  await expect(modalEditor).toBeVisible({ timeout: 10000 });
  return modalEditor;
}

async function registerAppScopeHotkeyCounter(
  obsidian: ObsidianAPI,
  counterKey: string,
  modifiers: string[],
  key: string,
) {
  await obsidian.page.evaluate(
    ({ counterKey, modifiers, key }) => {
      const globalState = (
        window as Window & {
          __mfdiE2EHotkeys?: Record<string, { count: number; handler: unknown }>;
        }
      );
      globalState.__mfdiE2EHotkeys ??= {};

      const existing = globalState.__mfdiE2EHotkeys[counterKey];
      if (existing?.handler) {
        app.scope.unregister(existing.handler as never);
      }

      const handler = app.scope.register(modifiers as never, key, () => {
        globalState.__mfdiE2EHotkeys![counterKey].count += 1;
        return false;
      });

      globalState.__mfdiE2EHotkeys[counterKey] = {
        count: 0,
        handler,
      };
    },
    { counterKey, modifiers, key },
  );
}

async function getAppScopeHotkeyCount(obsidian: ObsidianAPI, counterKey: string) {
  return obsidian.page.evaluate((key) => {
    const globalState = (
      window as Window & {
        __mfdiE2EHotkeys?: Record<string, { count: number }>;
      }
    );
    return globalState.__mfdiE2EHotkeys?.[key]?.count ?? 0;
  }, counterKey);
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

  const liveEditor = obsidian.page.locator(".mfdi-input-area .cm-content");
  await liveEditor.click();

  await expect.poll(() => getLiveEditorContent(obsidian)).toBe(text);
  await expect.poll(async () => {
    return obsidian.page.evaluate(() => {
      return app.workspace.activeEditor?.editor?.getValue() ?? null;
    });
  }).toBe(text);
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

async function getLiveEditorDOMContent(obsidian: ObsidianAPI) {
  return obsidian.page.evaluate(() => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!leaf) {
      throw new Error("mfdi-view leaf not found");
    }

    return leaf.view.containerEl.querySelector(".mfdi-input-area .cm-content")?.textContent ?? null;
  });
}

async function getLiveEditorDebugState(obsidian: ObsidianAPI) {
  return obsidian.page.evaluate(() => {
    const leaf = app.workspace.getLeavesOfType("mfdi-view")[0];
    if (!leaf) {
      throw new Error("mfdi-view leaf not found");
    }

    if (!(leaf.view as MFDIView).actionDelegates.onGetDebugStateForTesting) {
      throw new Error("onGetDebugStateForTesting is not ready");
    }

    return (leaf.view as MFDIView).actionDelegates.onGetDebugStateForTesting!();
  });
}

async function expectLiveEditorRestoreState(
  obsidian: ObsidianAPI,
  expected: string,
  options?: { expectedEditingPostMessage?: string | null },
) {
  await expect.poll(async () => {
    return (await getLiveEditorDebugState(obsidian)).persistedInput;
  }).toBe(expected);

  await expect.poll(async () => {
    return (await getLiveEditorDebugState(obsidian)).inputSnapshot;
  }).toBe(expected);

  await expect.poll(async () => {
    return (await getLiveEditorDebugState(obsidian)).editorSnapshot;
  }).toBe(expected);

  if (options && "expectedEditingPostMessage" in options) {
    await expect.poll(async () => {
      return (await getLiveEditorDebugState(obsidian)).editingPostMessage;
    }).toBe(options.expectedEditingPostMessage);
  }
}

// DO NOT EDIT: This is a helper function for the test "ライブエディタで Escape キーでマルチカーソルが解除される" to create a multi-cursor selection in the live editor. It simulates the user action of adding a new cursor on the next line. The implementation uses Obsidian's API to manipulate the editor's selections directly.
// copy from obsidian-advanced-cursor plugin:
async function getLiveEditorSelectionCount(obsidian: ObsidianAPI): Promise<number> {
  return obsidian.page.evaluate(() => {
    const editor = app.workspace.activeEditor?.editor;
    if (!editor) {
      throw new Error("active editor not found");
    }

    return editor.listSelections().length;
  });
}

// DO NOT EDIT: This is a helper function for the test "ライブエディタで Escape キーでマルチカーソルが解除される" to create a multi-cursor selection in the live editor. It simulates the user action of adding a new cursor on the next line. The implementation uses Obsidian's API to manipulate the editor's selections directly.
// copy from obsidian-advanced-cursor plugin:
async function createLiveEditorMulticursor(obsidian: ObsidianAPI): Promise<void> {
  await obsidian.page.evaluate(() => {
    const editor = app.workspace.activeEditor?.editor;
    if (!editor) {
      throw new Error("active editor not found");
    }

    const selections = editor.listSelections().map((selection) => ({
      anchor: selection.anchor,
      head: selection.head,
    }));
    const { ch, line } = selections[selections.length - 1].anchor;

    const nextLine = line + 1;
    const nextChar = Math.min(ch, editor.getLine(nextLine).length);
    const nextCursor = {
      line: nextLine,
      ch: nextChar,
    };

    selections.push({ anchor: nextCursor, head: nextCursor });
    editor.setSelections(selections);
  });
}
// ─── 待機時間定数 ───────────────────────────────────────────
const WAIT = {
  SHORT: 200,
  MEDIUM: 300,
  LONG: 500,
  DRAFT_SAVE: 3000,
} as const;

// ─── ヘルパー ────────────────────────────────────────────────

/** localStorage の mfdi 入力値を検証する */
async function expectLocalStorage(obsidian: ObsidianAPI, expected: string) {
  const appId = await obsidian.page.evaluate(() => app.appId);
  const periodicKey = createStorageKey(
    appId,
    getInputStorageKey("periodic", null),
  );
  const legacyKey = createStorageKey(appId, STORAGE_KEYS.INPUT);
  const fixedPrefix = `${getStorageKeyPrefix(appId)}${STORAGE_KEYS.INPUT_FIXED}:`;

  await expect
    .poll(() =>
      obsidian.page.evaluate(({ expected, periodicKey, legacyKey, fixedPrefix }) => {
        const candidateValues: string[] = [];

        const periodicInput = localStorage.getItem(periodicKey);
        const legacyInput = localStorage.getItem(legacyKey);

        if (typeof periodicInput === "string") candidateValues.push(periodicInput);
        if (typeof legacyInput === "string") candidateValues.push(legacyInput);

        // 意図: fixed入力はファイルパスごとのキーなので、prefix一致で横断して検証する。
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (!key.startsWith(fixedPrefix)) continue;
          const value = localStorage.getItem(key);
          if (typeof value === "string") {
            candidateValues.push(value);
          }
        }

        return candidateValues.some((value) => value.includes(expected));
      }, { expected, periodicKey, legacyKey, fixedPrefix }),
    )
    .toBe(true);
}

/** ライブエディタの状態（state / DOM）を一括検証する */
async function expectLiveEditorContent(
  obsidian: ObsidianAPI,
  expected: string,
) {
  await expect.poll(() => getLiveEditorContent(obsidian)).toBe(expected);
  await expect.poll(() => getLiveEditorDOMContent(obsidian)).toBe(expected);
  await expectLocalStorage(obsidian, expected);
}

// ─── テストスイート ──────────────────────────────────────────

test.describe("MFDI live editor e2e", () => {
  let liveEditor: Locator;

  // ほぼ全テストで必要な共通セットアップ
  test.beforeEach(async ({ obsidian }) => {
    liveEditor = await waitForMFDIReady(obsidian, obsidian.page);
  });

  // ── 起動 ────────────────────────────────────────────────────

  test("mfdiビュー起動時に view 未初期化エラーを出さない", async ({ obsidian }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    obsidian.page.on("pageerror", (e) => pageErrors.push(e.message));
    obsidian.page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await obsidian.page.waitForTimeout(WAIT.LONG);

    expect([...pageErrors, ...consoleErrors].join("\n")).not.toContain(
      "Cannot read properties of undefined (reading 'view')",
    );
  });

  // ── カレンダー ───────────────────────────────────────────────

  test("タイムライン中にカレンダー日付を押すとフォーカス表示へ戻る", async ({ obsidian }) => {
    await expect(obsidian.page.getByText("タイムライン表示中")).toBeVisible();

    await obsidian.page.getByTitle("サイドバーを切り替え").click();
    await obsidian.page.locator(".mini-calendar__day-cell").first().click();

    await expect(obsidian.page.locator(".mfdi-date-input")).toBeVisible();
    await expect(obsidian.page.getByText("タイムライン表示中")).toHaveCount(0);
  });

  // ── ライブエディタ ───────────────────────────────────────────

  test("ライブエディタで Playwright fill が使える", async ({ obsidian }) => {
    await liveEditor.click();
    await liveEditor.fill("Playwright live typing");
    await obsidian.page.waitForTimeout(WAIT.SHORT);

    await expect(liveEditor).toContainText("Playwright live typing");
  });

  test("ライブエディタで Escape キーでマルチカーソルが解除される", async ({ obsidian }) => {
    await liveEditor.click();
    await obsidian.page.waitForTimeout(WAIT.MEDIUM);

    // 2 つ目の選択範囲のため最低 15 文字必要
    await setLiveEditorContent(obsidian, "h\ne\nl\nlo\n w\no\nr\nl\nd\n t\ne\ns\nt");
    await obsidian.page.waitForTimeout(WAIT.MEDIUM);

    await createLiveEditorMulticursor(obsidian);
    await expect.poll(() => getLiveEditorSelectionCount(obsidian)).toBe(2);

    await obsidian.page.keyboard.press("Escape");
    await expect.poll(() => getLiveEditorSelectionCount(obsidian)).toBe(1);
  });

  // ── 投稿・スコープ ───────────────────────────────────────────

  test("Ctrl+Enter では MFDIView の Scope のみが呼ばれる", async ({ obsidian }) => {
    const message = `Scope submit ${Date.now()}`;
    await registerAppScopeHotkeyCounter(obsidian, "submit-parent", ["Ctrl"], "Enter");

    await setLiveEditorContent(obsidian, message);
    await liveEditor.click();
    await obsidian.page.keyboard.press("Control+Enter");
    await obsidian.page.waitForTimeout(WAIT.LONG);

    await expect(
      obsidian.page.locator(".list .markdown-rendered", { hasText: message }),
    ).toHaveCount(1);
    await expect
      .poll(() => getAppScopeHotkeyCount(obsidian, "submit-parent"))
      .toBe(0);
  });

  test("入力したテキストが投稿される", async ({ obsidian }) => {
    const message = `E2E post ${Date.now()}`;

    await setLiveEditorContent(obsidian, message);
    await obsidian.page.getByRole("button", { name: "投稿" }).click();
    await obsidian.page.waitForTimeout(WAIT.LONG);

    const content = await obsidian.page
      .locator(".list .markdown-rendered")
      .first()
      .innerText();

    expect(content).toContain(message);
  });

  test("投稿したポストを編集できて、変更がすぐに反映される", async ({ obsidian }) => {
    const message = `Editable post ${Date.now()}`;

    // 投稿
    await setLiveEditorContent(obsidian, message);
    await obsidian.page.getByRole("button", { name: "投稿" }).click();

    // 編集モードに入る
    await obsidian.page.locator(".list .base-card").first().dblclick();
    // ハイライト状態は `.base-card` の親要素に付与されるため、親側のクラスで検証する。
    await expect(obsidian.page.locator(".list .mfdi-card--highlighted .base-card").first()).toBeVisible();
    await expectLiveEditorContent(obsidian, message);

    // 編集して更新
    const editedMessage = `${message} - edited`;
    await setLiveEditorContent(obsidian, editedMessage);
    await obsidian.page.waitForTimeout(WAIT.LONG);
    await obsidian.page.getByRole("button", { name: "更新" }).click();

    // 更新後の検証
    await expectLiveEditorContent(obsidian, "");
    await expect.poll(() => obsidian.page.locator(".list .base-card").all()).toHaveLength(1);
    await expect.poll(() => obsidian.page.locator(".list .base-card").first().textContent()).toContain(editedMessage);
  });

  test("編集中タブを閉じても、編集中の状態が維持される", async ({ obsidian }) => {
    const message = `Close tab while editing ${Date.now()}`;

    // 投稿
    await setLiveEditorContent(obsidian, message);
    await obsidian.page.getByRole("button", { name: "投稿" }).click();

    // 編集モードに入る
    await obsidian.page.locator(".list .base-card").first().dblclick();
    // ハイライト状態は `.base-card` の親要素に付与されるため、親側のクラスで検証する。
    await expect(obsidian.page.locator(".list .mfdi-card--highlighted .base-card").first()).toBeVisible();
    await expectLiveEditorContent(obsidian, message);

    // タブを閉じて再度開く
    await obsidian.closeTab();
    await obsidian.command("mobile-first-daily-interface:mfdi-open-view");
    await obsidian.waitForViewType("mfdi-view");
    await expectLiveEditorRestoreState(obsidian, message, {
      expectedEditingPostMessage: message,
    });
    await expectLiveEditorContent(obsidian, message);


    // 編集して更新
    const editedMessage = `${message} - edited`;
    await setLiveEditorContent(obsidian, editedMessage);
    await obsidian.page.waitForTimeout(WAIT.LONG);
    await obsidian.page.getByRole("button", { name: "更新" }).click();

    // 更新後の検証
    await expectLiveEditorContent(obsidian, "");
    await expect.poll(() => obsidian.page.locator(".list .base-card").all()).toHaveLength(1);
    await expect.poll(() => obsidian.page.locator(".list .base-card").first().textContent()).toContain(editedMessage);
  });

  // ── ドラフト復元 ─────────────────────────────────────────────

  test("タブを閉じたあとライブエディタの内容が復元される", async ({ obsidian }) => {
    const draft = `draft-${Date.now()}`;

    await setLiveEditorContent(obsidian, draft);
    await obsidian.page.waitForTimeout(WAIT.DRAFT_SAVE);

    await obsidian.closeTab();
    await expectLocalStorage(obsidian, draft);
    await obsidian.command("mobile-first-daily-interface:mfdi-open-view");
    await obsidian.waitForViewType("mfdi-view");

    const reopenedEditor = obsidian.page.locator(".mfdi-input-area .cm-content");
    await expect(reopenedEditor).toBeVisible({ timeout: 15000 });
    await expectLiveEditorRestoreState(obsidian, draft, {
      expectedEditingPostMessage: null,
    });
    await expectLiveEditorContent(obsidian, draft);
  });
});
