import { expect, test } from "obsidian-e2e-toolkit";
import { PLUGIN_ID, dstrVaultOptions } from "./support";

test.use({ vaultOptions: dstrVaultOptions() });

test("不具合報告用の情報をクリップボードへコピーする", async ({ obsidian }) => {
  await obsidian.waitReady();
  await obsidian.evaluateApp(() => navigator.clipboard.writeText(""));

  await obsidian.command(`${PLUGIN_ID}:dstr-copy-debug-info`);

  await expect
    .poll(() => obsidian.evaluateApp(() => navigator.clipboard.readText()))
    .toContain("## Daystream 不具合報告用の情報");
  const text = await obsidian.evaluateApp(() => navigator.clipboard.readText());
  expect(text).toMatch(/- Daystream: \d+\.\d+\.\d+/);
  expect(text).toContain("## 直近のエラー");
});
