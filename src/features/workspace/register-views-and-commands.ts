import type { BuiltinMainContext } from "src/features/workspace/registration-context";
import { VIEW_TYPE_DAYSTREAM_EDITOR } from "src/features/composer/views/DaystreamEditorView";

const VIEW_TYPE_DAYSTREAM = "mfdi-view";

export function registerWorkspaceViews(context: BuiltinMainContext): void {
  context.registerView(VIEW_TYPE_DAYSTREAM, (leaf) => context.createDaystreamView(leaf));
  context.registerView(VIEW_TYPE_DAYSTREAM_EDITOR, (leaf) => context.createDaystreamEditorView(leaf));
}

export function registerWorkspaceRibbon(context: BuiltinMainContext): void {
  context.addRibbonIcon("pencil", "Daystream", () => {
    void context.attachDaystreamView({});
  });
}

export function registerWorkspaceCommands(context: BuiltinMainContext): void {
  context.addCommand({
    id: "daystream-open-view",
    name: "Open Daystream",
    callback: async () => {
      const leaf = await context.attachDaystreamView({});
      if (leaf) context.app.workspace.revealLeaf(leaf);
    },
  });

  context.addCommand({
    id: "daystream-open-fixed-note-view",
    name: "Create New Daystream Fixed Note",
    callback: () => {
      void context.createAndOpenFixedNote();
    },
  });

  // 意図: Ctrl+Enter 設定が無効でもキーボードのみで投稿できるようにする。
  // Obsidian のホットキー設定から任意のショートカットを割り当てられる。
  context.addCommand({
    id: "daystream-submit-post",
    name: "Daystream: 投稿を送信",
    checkCallback: (checking) => {
      const activeView = context.app.workspace.activeLeaf?.view;
      if (activeView?.getViewType() !== "mfdi-view") {
        return false;
      }

      if (checking) {
        const inputSnapshot = context.getDaystreamInputSnapshot();
        return inputSnapshot.trim().length > 0;
      }

      const submitFn = context.getDaystreamSubmitCallback();
      void submitFn?.();
    },
  });
}
