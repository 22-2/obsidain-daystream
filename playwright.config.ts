import { devices } from "@playwright/test";
import { defineObsidianConfig } from "obsidian-e2e-toolkit";

// macOS (darwin) の実行環境ではタイムアウトが短すぎてテストが不安定になる
//（特に CI の仮想 macOS 環境で外部要因により遅延が発生しやすい）ため、
// macOS のときだけテスト単位のタイムアウトを 90 秒に延長する。
// 変更理由をここに残しておくことで将来の見直しがしやすくなります。
const isMac = process.platform === "darwin";

export default defineObsidianConfig({
  // テスト単位タイムアウト（ミリ秒）
  timeout: isMac ? 90_000 : undefined,
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 意図: 1件目で止めず全失敗を一度に把握する。各テストは独立した一時vaultで起動するため並列化できる。
  workers: 2,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "obsidian",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
