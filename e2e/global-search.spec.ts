import { expect, test } from "obsidian-e2e-toolkit";
import { collapseDaystreamSidebars, daystreamVaultOptions, openDaystreamView } from "./support";

test.use({ vaultOptions: daystreamVaultOptions() });

// 意図: 検索入口の常設と閉じた後の復帰を、実際の Obsidian レンダラーでも保証する。
test("全体検索をどのタブからでも開き、元の表示へ戻せる", async ({ obsidian, page }, testInfo) => {
  const view = await openDaystreamView(obsidian);
  // 意図: CSS の復旧は toolkit のセットアップに任せ、利用側は適用結果だけを検証する。
  await expect(view).toHaveCSS("--daystream-css-loaded", "1");
  const search = view.getByTestId("daystream-global-search");
  const input = view.getByTestId("daystream-search-input");
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
  await collapseDaystreamSidebars(obsidian);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(search).toBeVisible();
  await expect(search.locator("span")).toBeHidden();
  const navigation = view.locator(".daystream-main-navigation");
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
