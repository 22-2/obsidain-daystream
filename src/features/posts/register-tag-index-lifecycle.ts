import { TFile } from "obsidian";
import { DSTRStorage } from "src/core/storage";
import type { PluginLifecycleContext } from "src/core/plugin-host";
import type { Settings } from "src/core/domain/settings";
import { createTagIndexExtension } from "src/core/db/tag-index-extension";

export function registerTagIndexLifecycle(
  context: PluginLifecycleContext<Settings>,
  appId: string,
  storage: DSTRStorage,
): void {
  const tagIndexExtension = createTagIndexExtension(appId);

  // dispose は Plugin の unload 機構に委ねて main のフィールドを不要にする
  context.register(() => {
    void tagIndexExtension.dispose();
  });

  context.app.workspace.onLayoutReady(async () => {
    try {
      const settings = context.getSettings();
      const intervalHours = settings.fullScanIntervalHours ?? 24;

      const last = storage.get<string | null>("lastFullScanAt", null);
      let shouldScan = false;

      if (!last) {
        shouldScan = true;
      } else {
        // intervalHours が 0 の場合は、常に(起動のたびに)スキャンを実行する
        const diffHours = window.moment().diff(window.moment(last), "hours", true);
        shouldScan = diffHours >= intervalHours;
      }

      if (!shouldScan) {
        return;
      }
      await tagIndexExtension.fullScan(context.shell, settings);
      storage.set("lastFullScanAt", window.moment().toISOString());
    } catch (e) {
      console.error("Failed to run conditional full scan:", e);
    }
  });

  context.registerEvent(
    context.app.vault.on("create", (file) => {
      if (!(file instanceof TFile)) return;
      // 意図: 日付跨ぎ投稿では「ノート新規作成 -> 直後に追記」が連続し、
      // metadataCache.changed だけに依存すると初回インデックスを取りこぼすケースがある。
      // create を拾っておくことで、少なくとも新規ノート自体は確実に DB へ流せる。
      void tagIndexExtension.handleFileChanged(context.shell, file, context.getSettings());
    }),
  );

  context.registerEvent(
    context.app.vault.on("modify", (file) => {
      if (!(file instanceof TFile)) return;
      // 意図: 投稿保存は Vault の modify 経由で発生するため、
      // ここを一次トリガーにすると UI/DB の反映遅延を最小化できる。
      void tagIndexExtension.handleFileChanged(context.shell, file, context.getSettings());
    }),
  );

  context.registerEvent(
    context.app.metadataCache.on("changed", (file) => {
      void tagIndexExtension.handleFileChanged(context.shell, file, context.getSettings());
    }),
  );

  context.registerEvent(
    context.app.vault.on("rename", (file, oldPath) => {
      if (!(file instanceof TFile)) return;
      void tagIndexExtension.handleFileRenamed(context.shell, file, oldPath, context.getSettings());
    }),
  );

  context.registerEvent(
    context.app.vault.on("delete", (file) => {
      if (!(file instanceof TFile)) return;
      void tagIndexExtension.handleFileDeleted(file.path);
    }),
  );
}
