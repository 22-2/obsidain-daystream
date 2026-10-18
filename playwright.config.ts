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
  // 意図: 4 vCPU の Windows runner は3並列、macOS runner は2並列でCPUを使い切る。
  // ローカルの Windows は offstage-windows が1回の実行で1つの非表示デスクトップを共有するため1並列にする。
  workers: process.env.CI ? (process.platform === "win32" ? 3 : 2) : process.platform === "win32" ? 1 : 2,
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
