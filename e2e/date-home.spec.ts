import { expect, test } from "obsidian-e2e-toolkit";
import { collapseDSTRSidebars, dstrVaultOptions, openDSTRView } from "./support";

test.use({ vaultOptions: dstrVaultOptions() });

// 意図: クラスの切替だけでなく実際のテーマ下の色と、日付入力から Home へ戻る操作を確認する。
test("ホームは今月へ戻り、別の月では色が変わる", async ({
  obsidian,
  page,
}, testInfo) => {
  const view = await openDSTRView(obsidian);
  // 意図: Obsidian と Daystream のサイドバーで中央が潰れないよう、日付操作の検証に必要な幅を確保する。
  await collapseDSTRSidebars(obsidian);
  await view.getByRole("tab", { name: "日付", exact: true }).click();
  const navigation = view.locator(".dstr-statusbar-date-bar");
  const home = navigation.getByRole("button", { name: "ホーム", exact: true });
  const year = navigation.getByRole("spinbutton", { name: "年", exact: true });
  const month = navigation.getByRole("combobox", { name: "月", exact: true });
  const day = navigation.getByRole("combobox", { name: "日", exact: true });
  const now = await obsidian.evaluateApp(() => ({
    year: window.moment().year(),
    month: window.moment().month() + 1,
  }));

  await home.click();
  await expect(year).toHaveValue(String(now.year));
  await expect(month).toHaveValue(String(now.month));
  await expect(day).toHaveValue("");
  await expect(home).not.toHaveClass(/dstr-home-action--active/);
  // 意図: ホバー色ではなく通常時の色を比較し、アイコンの色遷移が終わってから基準色を読む。
  await year.hover();
  await expect
    .poll(() => home.evaluate((element) => element.getAnimations().length))
    .toBe(0);
  const homeColor = await home.evaluate(
    (element) => getComputedStyle(element).color,
  );

  await year.fill(String(now.year - 1));
  await month.selectOption(String(now.month));
  await expect(home).toHaveClass(/dstr-home-action--active/);
  await expect
    .poll(() => home.evaluate((element) => getComputedStyle(element).color))
    .not.toBe(homeColor);

  await home.click();
  await expect(year).toHaveValue(String(now.year));
  await expect(month).toHaveValue(String(now.month));
  await expect(day).toHaveValue("");
  await expect(home).not.toHaveClass(/dstr-home-action--active/);
  await year.hover();
  await expect(home).toHaveCSS("color", homeColor);
  await page.screenshot({ path: testInfo.outputPath("date-home.png") });
});
