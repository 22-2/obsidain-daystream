import { around } from "monkey-around";
import { TFile, WorkspaceLeaf, type ViewState } from "obsidian";
import { DSTRStorage } from "src/core/storage";
import type { BuiltinMainContext } from "src/features/workspace/registration-context";
import { createFixedNoteViewExtension } from "src/features/notes/extensions/fixed-note-view-extension";
import { readLastOpenedFixedSessionNumber } from "src/features/notes/utils/fixed-session-storage";

// 意図: Markdown leafを固定ノートviewへ置き換える登録はnotes featureが所有する。
export function registerFixedNoteViewLifecycle(
  context: BuiltinMainContext,
  storage: DSTRStorage,
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
      setViewState(original: WorkspaceLeaf["setViewState"]) {
        return function (this: WorkspaceLeaf, viewState: ViewState, eState?: unknown) {
          const nextState = fixedNoteViewExtension.convertMarkdownViewState(viewState);
          return original.call(this, nextState, eState);
        };
      },
    }),
  );

  // 意図: 起動時の workspace 復元より前に走ると復元前の leaf しか見えないため、
  // レイアウト確定後に開いている固定ノートの markdown leaf を置き換える。
  context.app.workspace.onLayoutReady(() => {
    void fixedNoteViewExtension.replaceOpenFixedMarkdownLeaves({
      leaves: context.app.workspace.getLeavesOfType("markdown"),
      attachDSTRView: context.attachDSTRView,
    });
  });
}
