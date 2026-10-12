import path from "node:path";
import { expect, test } from "obsidian-e2e-toolkit";

test.use({
  vaultOptions: { fresh: true, plugins: [{ path: path.resolve("dist") }] },
});

test("タブ復帰とビューの開き直しで左右の開閉状態を維持する", async ({
  obsidian,
  page,
}) => {
  await obsidian.waitReady();
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.evaluate(() => {
    app.workspace.leftSplit.collapse();
    app.workspace.rightSplit.collapse();
  });
  await obsidian.command("mobile-first-daily-interface:mfdi-open-view");
  const view = page.locator('.workspace-leaf-content[data-type="mfdi-view"]');
  const root = view.locator(".mfdi-dashboard-root");
  const leftPanel = view.locator(".mfdi-dashboard-sidebar--left");
  const rightPanel = view.locator(".mfdi-dashboard-sidebar--right");
  await expect
    .poll(() =>
      root.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThan(1400);
  await expect(leftPanel).toBeVisible();
  await expect(rightPanel).toBeVisible();

  await view.getByLabel("ナビゲーターを切り替え", { exact: true }).click();
  await expect(leftPanel).toHaveClass(/(?:^|\s)hidden(?:\s|$)/);

  // 意図: 実際に別タブへ移り、ネイティブ ResizeObserver に非表示時の幅 0 を通知させる。
  await page.evaluate(async () => {
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

  await page.evaluate(() =>
    app.workspace.revealLeaf(app.workspace.getLeavesOfType("mfdi-view")[0]),
  );
  await expect(root).toBeVisible();
  await expect(leftPanel).toBeHidden();
  await expect(rightPanel).toBeVisible();

  // 意図: store の再作成と保存状態の復元まで通し、初回の幅測定でも上書きしないことを確認する。
  await page.evaluate(() =>
    app.workspace.getLeavesOfType("mfdi-view")[0].detach(),
  );
  await obsidian.command("mobile-first-daily-interface:mfdi-open-view");
  await expect(root).toBeVisible();
  await expect(leftPanel).toBeHidden();
  await expect(rightPanel).toBeVisible();
});
