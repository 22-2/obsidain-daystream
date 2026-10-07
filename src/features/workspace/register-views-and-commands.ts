import type { BuiltinMainContext } from "src/features/workspace/registration-context";
import { VIEW_TYPE_MFDI_EDITOR } from "src/features/composer/views/MFDIEditorView";

const VIEW_TYPE_MFDI = "mfdi-view";

export function registerWorkspaceViews(context: BuiltinMainContext): void {
  context.registerView(VIEW_TYPE_MFDI, (leaf) => context.createMFDIView(leaf));
  context.registerView(VIEW_TYPE_MFDI_EDITOR, (leaf) => context.createMFDIEditorView(leaf));
}

export function registerWorkspaceRibbon(context: BuiltinMainContext): void {
  context.addRibbonIcon("pencil", "Mobile First Daily Interface", () => {
    void context.attachMFDIView({});
  });
}

export function registerWorkspaceCommands(context: BuiltinMainContext): void {
  context.addCommand({
    id: "mfdi-open-view",
    name: "Open Mobile First Daily Interface",
    callback: async () => {
      const leaf = await context.attachMFDIView({});
      if (leaf) context.app.workspace.revealLeaf(leaf);
    },
  });

  context.addCommand({
    id: "mfdi-open-fixed-note-view",
    name: "Create New MFDI Fixed Note",
    callback: () => {
      void context.createAndOpenFixedNote();
    },
  });

  // 意図: Ctrl+Enter 設定が無効でもキーボードのみで投稿できるようにする。
  // Obsidian のホットキー設定から任意のショートカットを割り当てられる。
  context.addCommand({
    id: "mfdi-submit-post",
    name: "MFDI: 投稿を送信",
    checkCallback: (checking) => {
      const activeView = context.app.workspace.activeLeaf?.view;
      if (activeView?.getViewType() !== "mfdi-view") {
        return false;
      }

      if (checking) {
        const inputSnapshot = context.getMFDIInputSnapshot();
        return inputSnapshot.trim().length > 0;
      }

      const submitFn = context.getMFDISubmitCallback();
      void submitFn?.();
    },
  });
}
