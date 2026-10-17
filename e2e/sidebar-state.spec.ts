import { expect, test } from "obsidian-e2e-toolkit";
import { DSTR_VIEW_TYPE, dstrVaultOptions, openDSTRView } from "./support";

test.use({ vaultOptions: dstrVaultOptions() });

test("タブ復帰とビューの開き直しで左右の開閉状態を維持する", async ({
  obsidian,
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  await obsidian.collapseSidebars();
  const view = await openDSTRView(obsidian);
  const root = view.locator(".dstr-dashboard-root");
  const leftPanel = view.locator(".dstr-dashboard-sidebar--left");
  const rightPanel = view.locator(".dstr-dashboard-sidebar--right");
  // 意図: 1800px のviewportでも Obsidian の領域を差し引くとleafは約1370pxになるため、両パネル表示に必要な幅で確認する。
  await expect
    .poll(() =>
      root.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThan(1300);
  await expect(leftPanel).toBeVisible();
  await expect(rightPanel).toBeVisible();

  await view.getByLabel("ナビゲーターを切り替え", { exact: true }).click();
  await expect(leftPanel).toHaveClass(/(?:^|\s)hidden(?:\s|$)/);

  // 意図: 実際に別タブへ移り、ネイティブ ResizeObserver に非表示時の幅 0 を通知させる。
  await obsidian.evaluateApp(async () => {
    await app.workspace
      .getLeaf(true)
      .setViewState({ type: "empty", active: true });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await expect(root).toBeHidden();
  await expect(leftPanel).toHaveClass(/(?:^|\s)hidden(?:\s|$)/);
  await expect(rightPanel).not.toHaveClass(/(?:^|\s)hidden(?:\s|$)/);

  await obsidian.revealView(DSTR_VIEW_TYPE);
  await expect(root).toBeVisible();
  await expect(leftPanel).toBeHidden();
  await expect(rightPanel).toBeVisible();

  // 意図: store の再作成と保存状態の復元まで通し、初回の幅測定でも上書きしないことを確認する。
  await obsidian.evaluateApp(() =>
    app.workspace.getLeavesOfType("dstr-view")[0].detach(),
  );
  await openDSTRView(obsidian);
  await expect(root).toBeVisible();
  await expect(leftPanel).toBeHidden();
  await expect(rightPanel).toBeVisible();
});
