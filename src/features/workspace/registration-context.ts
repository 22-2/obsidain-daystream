import type { Command, ItemView, WorkspaceLeaf } from "obsidian";
import type { Settings } from "src/core/domain/settings";
import type { PluginLifecycleContext } from "src/core/plugin-host";
import type { MFDIEditorView } from "src/features/composer/views/MFDIEditorView";
import type { MFDIView } from "src/features/workspace/views/MFDIView";
import type { MFDIViewState } from "src/features/workspace/views/state";

// 意図: workspace view固有のfactoryと操作だけをgeneric host契約へ重ねる。
export interface BuiltinMainContext extends PluginLifecycleContext<Settings> {
  registerView: (type: string, viewCreator: (leaf: WorkspaceLeaf) => ItemView) => void;
  addRibbonIcon: (icon: string, title: string, callback: () => void) => HTMLElement;
  addCommand: (command: Command) => Command;
  getMFDISubmitCallback: () => (() => Promise<void>) | undefined;
  getMFDIInputSnapshot: () => string;
  createMFDIView: (leaf: WorkspaceLeaf) => MFDIView;
  createMFDIEditorView: (leaf: WorkspaceLeaf) => MFDIEditorView;
  createAndOpenFixedNote: () => Promise<void>;
  attachMFDIView: (
    state: Partial<MFDIViewState>,
    preferredLeaf?: WorkspaceLeaf,
  ) => Promise<WorkspaceLeaf | undefined>;
}
