import type { BuiltinMainContext } from "src/features/workspace/registration-context";
import { VIEW_TYPE_DSTR, VIEW_TYPE_DSTR_EDITOR } from "src/core/view-types";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";

export function registerWorkspaceViews(context: BuiltinMainContext): void {
  context.registerView(VIEW_TYPE_DSTR, (leaf) => context.createDSTRView(leaf));
  context.registerView(VIEW_TYPE_DSTR_EDITOR, (leaf) => context.createDSTREditorView(leaf));
  context.registerView(LEGACY_DAYSTREAM_IDENTIFIERS.viewType, (leaf) =>
    context.createDSTRView(leaf, LEGACY_DAYSTREAM_IDENTIFIERS.viewType),
  );
  context.registerView(LEGACY_DAYSTREAM_IDENTIFIERS.editorViewType, (leaf) =>
    context.createDSTREditorView(leaf, LEGACY_DAYSTREAM_IDENTIFIERS.editorViewType),
  );
}

export function registerWorkspaceRibbon(context: BuiltinMainContext): void {
  context.addRibbonIcon("pencil", "Daystream", () => {
    void context.attachDSTRView({});
  });
}

export function registerWorkspaceCommands(context: BuiltinMainContext): void {
  context.addCommand({
    id: "dstr-open-view",
    name: "Open Daystream",
    callback: async () => {
      const leaf = await context.attachDSTRView({});
      if (leaf) context.app.workspace.revealLeaf(leaf);
    },
  });

  context.addCommand({
    id: "dstr-open-fixed-note-view",
    name: "Create New Daystream Fixed Note",
    callback: () => {
      void context.createAndOpenFixedNote();
    },
  });

  // 意図: Ctrl+Enter 設定が無効でもキーボードのみで投稿できるようにする。
  // Obsidian のホットキー設定から任意のショートカットを割り当てられる。
  context.addCommand({
    id: "dstr-submit-post",
    name: "Daystream: 投稿を送信",
    checkCallback: (checking) => {
      const activeView = context.app.workspace.activeLeaf?.view;
      if (activeView?.getViewType() !== VIEW_TYPE_DSTR) {
        return false;
      }

      if (checking) {
        const inputSnapshot = context.getDSTRInputSnapshot();
        return inputSnapshot.trim().length > 0;
      }

      const submitFn = context.getDSTRSubmitCallback();
      void submitFn?.();
    },
  });
}
