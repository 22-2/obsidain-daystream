import type { App, WorkspaceLeaf } from "obsidian";
import { TFile } from "obsidian";
import { reportError } from "src/core/error-report";
import { parseFixedSessionSections } from "src/core/fixed-sessions";
import { isDSTRFixedNotePath } from "src/core/fixed-note";
import type { PluginLifecycleContext } from "src/core/plugin-host";
import type { Settings } from "src/core/domain/settings";
import type { DSTRStorage } from "src/core/storage";
import {
  followRenamedFixedNoteLeaves,
  moveFixedNoteStorage,
} from "src/features/notes/utils/follow-renamed-fixed-note";
import { forgetDeletedFixedNote } from "src/features/notes/utils/forget-deleted-fixed-note";
import {
  getFixedSessionMetaFilePath,
  getLegacyFixedSessionMetaFilePath,
} from "src/features/notes/utils/fixed-session-storage";

function collectAllLeaves(app: App): WorkspaceLeaf[] {
  const leaves: WorkspaceLeaf[] = [];
  app.workspace.iterateAllLeaves((leaf) => {
    leaves.push(leaf);
  });
  return leaves;
}

// 意図: セッション表示名などはノート横のサイドカーファイルにあるため、ノートと一緒に名前を変える。
async function moveFixedSessionMetaFile(app: App, oldPath: string, newPath: string) {
  const nextSidecarPath = getFixedSessionMetaFilePath(newPath);
  if (app.vault.getAbstractFileByPath(nextSidecarPath)) return;

  const sidecar = [getFixedSessionMetaFilePath(oldPath), getLegacyFixedSessionMetaFilePath(oldPath)]
    .map((path) => app.vault.getAbstractFileByPath(path))
    .find((file) => file instanceof TFile);
  if (sidecar) await app.fileManager.renameFile(sidecar, nextSidecarPath);
}

async function followRenamedFixedNote(
  context: PluginLifecycleContext<Settings>,
  storage: DSTRStorage,
  file: TFile,
  oldPath: string,
): Promise<void> {
  const { app } = context;
  await followRenamedFixedNoteLeaves(collectAllLeaves(app), oldPath, file.path);

  // 意図: セッションごとの下書きキーはセッション番号を含むため、ノートにあるセッションをすべて移す。
  const content = await app.vault.cachedRead(file);
  const sessionNumbers = parseFixedSessionSections(content, context.getSettings().insertAfter).map(
    (section) => section.sessionNumber,
  );
  moveFixedNoteStorage(storage, oldPath, file.path, [...new Set([1, ...sessionNumbers])]);

  await moveFixedSessionMetaFile(app, oldPath, file.path);
}

// 意図: 固定ノート登録一覧と開いているビューのVault追従をnotes featureで所有し、workspace起動配線から分離する。
export function registerFixedNoteRegistry(
  context: PluginLifecycleContext<Settings>,
  storage: DSTRStorage,
): void {
  context.registerEvent(
    context.app.vault.on("rename", (file, oldPath) => {
      if (!(file instanceof TFile)) return;

      if (isDSTRFixedNotePath(oldPath)) {
        void followRenamedFixedNote(context, storage, file, oldPath).catch((error) =>
          reportError({
            context: "Failed to follow renamed fixed note",
            error,
            details: { oldPath, path: file.path },
          }),
        );
      }

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
        void forgetDeletedFixedNote(collectAllLeaves(context.app), file.path).catch((error) =>
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
