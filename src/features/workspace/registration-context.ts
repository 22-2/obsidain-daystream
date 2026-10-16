import type { Command, ItemView, WorkspaceLeaf } from "obsidian";
import type { Settings } from "src/core/domain/settings";
import type { PluginLifecycleContext } from "src/core/plugin-host";
import type { DaystreamEditorView } from "src/features/composer/views/DaystreamEditorView";
import type { DaystreamView } from "src/features/workspace/views/DaystreamView";
import type { DaystreamViewState } from "src/features/workspace/views/state";

// 意図: workspace view固有のfactoryと操作だけをgeneric host契約へ重ねる。
export interface BuiltinMainContext extends PluginLifecycleContext<Settings> {
  registerView: (type: string, viewCreator: (leaf: WorkspaceLeaf) => ItemView) => void;
  addRibbonIcon: (icon: string, title: string, callback: () => void) => HTMLElement;
  addCommand: (command: Command) => Command;
  getDaystreamSubmitCallback: () => (() => Promise<void>) | undefined;
  getDaystreamInputSnapshot: () => string;
  createDaystreamView: (leaf: WorkspaceLeaf) => DaystreamView;
  createDaystreamEditorView: (leaf: WorkspaceLeaf) => DaystreamEditorView;
  createAndOpenFixedNote: () => Promise<void>;
  attachDaystreamView: (
    state: Partial<DaystreamViewState>,
    preferredLeaf?: WorkspaceLeaf,
  ) => Promise<WorkspaceLeaf | undefined>;
}
