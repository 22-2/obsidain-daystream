import type { WorkspaceLeaf } from "obsidian";
import { TFile } from "obsidian";
import { reportError } from "src/core/error-report";
import { isDSTRFixedNotePath } from "src/core/fixed-note";
import type { PluginLifecycleContext } from "src/core/plugin-host";
import type { Settings } from "src/core/domain/settings";
import { forgetDeletedFixedNote } from "src/features/notes/utils/forget-deleted-fixed-note";

// 意図: 固定ノート登録一覧のVault追従をnotes featureで所有し、workspace起動配線から分離する。
export function registerFixedNoteRegistry(context: PluginLifecycleContext<Settings>): void {
  context.registerEvent(
    context.app.vault.on("rename", (file, oldPath) => {
      if (!(file instanceof TFile)) return;

      const settings = context.getSettings();
      const idx = settings.files.findIndex((entry) => entry.path === oldPath);
      if (idx === -1) return;

      settings.files = settings.files.map((entry, index) =>
        index === idx ? { ...entry, path: file.path } : entry,
      );
      void context.saveSettings();
    }),
  );

  context.registerEvent(
    context.app.vault.on("delete", (file) => {
      if (!(file instanceof TFile)) return;

      if (isDSTRFixedNotePath(file.path)) {
        const leaves: WorkspaceLeaf[] = [];
        context.app.workspace.iterateAllLeaves((leaf) => {
          leaves.push(leaf);
        });
        void forgetDeletedFixedNote(leaves, file.path).catch((error) =>
          reportError({
            context: "Failed to forget deleted fixed note",
            error,
            details: { path: file.path },
          }),
        );
      }

      const settings = context.getSettings();
      const filtered = settings.files.filter((entry) => entry.path !== file.path);
      if (filtered.length === settings.files.length) return;

      settings.files = filtered;
      void context.saveSettings();
    }),
  );
}
