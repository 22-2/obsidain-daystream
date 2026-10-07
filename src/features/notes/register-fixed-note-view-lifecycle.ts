import { around } from "monkey-around";
import { TFile, WorkspaceLeaf } from "obsidian";
import { MFDIStorage } from "src/core/storage";
import type { BuiltinMainContext } from "src/features/workspace/registration-context";
import { createFixedNoteViewExtension } from "src/features/notes/extensions/fixed-note-view-extension";
import { readLastOpenedFixedSessionNumber } from "src/features/notes/utils/fixed-session-storage";

// 意図: Markdown leafを固定ノートviewへ置き換える登録はnotes featureが所有する。
export function registerFixedNoteViewLifecycle(
  context: BuiltinMainContext,
  storage: MFDIStorage,
): void {
  const fixedNoteViewExtension = createFixedNoteViewExtension({
    // 意図: setViewState の同期経路で await できないため、存在確認は同期 API で完了させる。
    isFixedNoteAvailable: (filePath) => {
      return context.app.vault.getAbstractFileByPath(filePath) instanceof TFile;
    },
    getPreferredFixedSessionNumber: (filePath) => {
      return readLastOpenedFixedSessionNumber(storage, filePath) ?? undefined;
    },
  });

  context.register(
    around(WorkspaceLeaf.prototype, {
      setViewState(original: Function) {
        return function (this: WorkspaceLeaf, viewState, eState) {
          const nextState = fixedNoteViewExtension.convertMarkdownViewState(viewState);
          return original.call(this, nextState, eState);
        };
      },
    }),
  );

  void fixedNoteViewExtension.replaceOpenFixedMarkdownLeaves({
    leaves: context.app.workspace.getLeavesOfType("markdown"),
    attachMFDIView: context.attachMFDIView,
  });
}
