import path from "node:path";
import { expect, test } from "obsidian-e2e-toolkit";

test.use({ vaultOptions: { fresh: true, plugins: [{ path: path.resolve("dist") }] } });

// 意図: 検索入口の常設と閉じた後の復帰を、実際の Obsidian レンダラーでも保証する。
test("全体検索をどのタブからでも開き、元の表示へ戻せる", async ({ obsidian }, testInfo) => {
  await obsidian.waitReady();
  // 意図: Playwright の page fixture は別ページを指し得るため、Obsidian のレンダラーを使う。
  const page = obsidian.page;
  await obsidian.waitForPluginEnabled("mobile-first-daily-interface");
  await obsidian.command("mobile-first-daily-interface:mfdi-open-view");
  await obsidian.waitForViewType("mfdi-view");
  const view = page.locator('.workspace-leaf-content[data-type="mfdi-view"]');
  // 意図: テスト用 vault では有効化済みでも CSS が未適用のことがあるため、
  // Obsidian 自身のロード処理で復旧し、実際のスタイル適用を待ってから操作する。
  await view.waitFor();
  if (await view.evaluate((element) => getComputedStyle(element).getPropertyValue("--mfdi-css-loaded").trim() !== "1")) {
    await page.evaluate(async () => {
      const plugin = app.plugins.getPlugin("mobile-first-daily-interface") as unknown as { loadCSS: () => Promise<void> } | null;
      if (!plugin) throw new Error("MFDI plugin is not loaded");
      await plugin.loadCSS();
    });
  }
  await expect(view).toHaveCSS("--mfdi-css-loaded", "1");
  const search = view.getByRole("button", { name: "全体検索", exact: true });
  const input = view.getByRole("searchbox", { name: "本文・URL・タグを検索" });
  await expect(search).toBeVisible();
  await expect(view.getByRole("tab", { name: "検索", exact: true })).toHaveCount(0);
  for (const name of ["タイムライン", "日付", "タスク", "インサイト"]) {
    const tab = view.getByRole("tab", { name, exact: true });
    await tab.click();
    await search.click();
    await expect(input).toBeFocused();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await input.fill("検索テスト");
    await input.press("Escape");
    await expect(input).toHaveCount(0);
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(search).toBeFocused();
  }
  await search.press("Control+f");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("検索テスト");
  await view.getByRole("button", { name: "検索を閉じる", exact: true }).click();
  await expect(input).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("global-search-desktop.png") });
  // 意図: デスクトップの左右サイドバーで中央が潰れないよう、狭幅の検証は
  // サイドバーを閉じたモバイル相当の表示で行う。
  await page.getByLabel("ナビゲーターを切り替え", { exact: true }).click();
  await page.getByLabel("インサイトを切り替え", { exact: true }).click();
  await page.evaluate(() => {
    app.workspace.leftSplit.collapse();
    app.workspace.rightSplit.collapse();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(search).toBeVisible();
  await expect(search.locator("span")).toBeHidden();
  const navigation = view.locator(".mfdi-main-navigation");
  // 意図: Obsidian のサイドバーの閉じるアニメーション完了後の幅を測る。
  await expect.poll(async () => (await navigation.boundingBox())?.width ?? 0).toBeGreaterThan(200);
  const bounds = await navigation.boundingBox();
  const searchBounds = await search.boundingBox();
  expect(bounds).toBeTruthy();
  expect(searchBounds!.x + searchBounds!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
  await search.click();
  await expect(input).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("global-search-mobile.png") });
});
