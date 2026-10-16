import type { Command, ItemView, WorkspaceLeaf } from "obsidian";
import type { Settings } from "src/core/domain/settings";
import type { PluginLifecycleContext } from "src/core/plugin-host";
import type { DSTREditorView } from "src/features/composer/views/DSTREditorView";
import type { DSTRView } from "src/features/workspace/views/DSTRView";
import type { DSTRViewState } from "src/features/workspace/views/state";

// 意図: workspace view固有のfactoryと操作だけをgeneric host契約へ重ねる。
export interface BuiltinMainContext extends PluginLifecycleContext<Settings> {
  registerView: (type: string, viewCreator: (leaf: WorkspaceLeaf) => ItemView) => void;
  addRibbonIcon: (icon: string, title: string, callback: () => void) => HTMLElement;
  addCommand: (command: Command) => Command;
  getDSTRSubmitCallback: () => (() => Promise<void>) | undefined;
  getDSTRInputSnapshot: () => string;
  createDSTRView: (leaf: WorkspaceLeaf) => DSTRView;
  createDSTREditorView: (leaf: WorkspaceLeaf) => DSTREditorView;
  createAndOpenFixedNote: () => Promise<void>;
  attachDSTRView: (
    state: Partial<DSTRViewState>,
    preferredLeaf?: WorkspaceLeaf,
  ) => Promise<WorkspaceLeaf | undefined>;
}
