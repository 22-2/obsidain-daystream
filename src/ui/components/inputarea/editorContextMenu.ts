import { Menu, WorkspaceWindow } from "obsidian";
import type { EditorExpansionMode } from "src/settings";
import type { MFDIView } from "src/ui/view/MFDIView";

export function isEditorAlreadyInSeparateWindow(view: MFDIView): boolean {
  // 意図: MFDI ビュー自体をポップアウトした場合も二重の別ウィンドウ操作を出さない。
  return (
    view.leaf.getContainer() instanceof WorkspaceWindow ||
    view.app.workspace.getLeavesOfType("mfdi-editor-view").length > 0
  );
}

export function showEditorContextMenu(
  event: { clientX: number; clientY: number },
  options: {
    editorExpansionMode: EditorExpansionMode;
    hasEditorPopout: boolean;
    onOpenInNewWindow: () => void;
    onChangeEditorExpansionMode: (mode: EditorExpansionMode) => void;
  },
): void {
  const menu = new Menu();
  if (!options.hasEditorPopout) {
    menu.addItem((item) => {
      item
        .setTitle("別ウィンドウで開く")
        .setIcon("picture-in-picture-2")
        .onClick(options.onOpenInNewWindow);
    });
  }

  menu.addItem((item) => {
    item
      .setTitle("フル展開")
      .setChecked(options.editorExpansionMode === "full")
      .onClick(() => options.onChangeEditorExpansionMode("full"));
  });
  menu.addItem((item) => {
    item
      .setTitle("デフォルトの展開")
      .setChecked(options.editorExpansionMode === "default")
      .onClick(() => options.onChangeEditorExpansionMode("default"));
  });
  menu.showAtPosition({ x: event.clientX, y: event.clientY });
}
