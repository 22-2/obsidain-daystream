import type { WorkspaceLeaf } from "obsidian";
import { ItemView, Menu, Scope } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { renameFixedNote as renameFixedNoteFile } from "src/core/fixed-note";
import type { EditorExpansionMode, Settings } from "src/core/domain/settings";
import { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { ReactView } from "src/features/workspace/components/ReactView";
import { addDaystreamPaneMenuItems } from "src/features/workspace/menus/daystreamPaneMenu";
import "src/core/ui/styles/global.css";
import "src/core/ui/styles/daystream.css";
import type { DaystreamViewDelegates } from "src/features/workspace/views/DaystreamViewHandler";
import { DaystreamFixedNoteTitle } from "src/features/workspace/views/DaystreamFixedNoteTitle";
import type { DaystreamViewState } from "src/features/workspace/views/state";
import {
  DEFAULT_DAYSTREAM_VIEW_STATE,
  getFixedNoteTitle,
  getDaystreamViewCapabilities,
} from "src/features/workspace/views/state";

// Keep the persisted Obsidian type so saved workspace leaves still restore after the rebrand.
export const VIEW_TYPE_DAYSTREAM = "mfdi-view";

export class DaystreamView extends ItemView {
  private root: Root | null = null;
  private settings: Settings;
  private state: DaystreamViewState = { ...DEFAULT_DAYSTREAM_VIEW_STATE };
  private externalStateRevision = 0;
  private readonly fixedNoteTitle: DaystreamFixedNoteTitle;
  private reactReadyPromise: Promise<void>;
  private resolveReactReady: (() => void) | null = null;
  private hasOpened = false;

  public navigation = false;
  public readonly actionDelegates: DaystreamViewDelegates = {};

  constructor(
    leaf: WorkspaceLeaf,
    settings: Settings,
    private readonly persistEditorExpansionMode?: (mode: EditorExpansionMode) => Promise<void>,
  ) {
    super(leaf);
    this.settings = settings;
    this.fixedNoteTitle = new DaystreamFixedNoteTitle(
      this,
      () => this.state,
      (newTitle) => this.renameFixedNote(newTitle),
    );
    this.resetReactReady();
  }

  // -----------------------------------------------------------------------
  // ItemView Overrides
  // -----------------------------------------------------------------------

  getIcon(): string {
    return "pencil";
  }

  getViewType(): string {
    return VIEW_TYPE_DAYSTREAM;
  }

  getDisplayText(): string {
    if (this.state.noteMode === "fixed") {
      return `Daystream: ${getFixedNoteTitle(this.state.file)}`;
    }
    return "Daystream";
  }

  async onOpen(): Promise<void> {
    if (this.hasOpened) {
      this.resetReactReady();
    }
    this.hasOpened = true;
    this.setupShortcuts();

    // fixedノートを開いたときなど、すぐに render せずに少し待つ。
    // 状態の反映が不完全なまま描画されるのを防ぐため。
    window.setTimeout(() => this.updateView());
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
    this.notifyReactReady();
  }

  waitForReactReady(): Promise<void> {
    return this.reactReadyPromise;
  }

  notifyReactReady(): void {
    const resolve = this.resolveReactReady;
    this.resolveReactReady = null;
    resolve?.();
  }

  onPaneMenu(menu: Menu, prev: string): void {
    addDaystreamPaneMenuItems(menu, {
      getState: () => this.state,
      actionDelegates: this.actionDelegates,
    });

    super.onPaneMenu(menu, prev);
  }

  // -----------------------------------------------------------------------
  // State Management
  // -----------------------------------------------------------------------

  getState(): DaystreamViewState {
    return this.state;
  }

  getExternalStateRevision(): number {
    return this.externalStateRevision;
  }

  setStatePartial(patch: Partial<DaystreamViewState>): void {
    this.state = {
      ...this.state,
      ...patch,
      noteMode: patch.noteMode ?? this.state.noteMode,
      file: patch.file !== undefined ? patch.file : this.state.file,
    };
  }

  async setState(state: DaystreamViewState): Promise<void> {
    this.setStatePartial(state);
    // Obsidian から復元・適用された state だけを React store への入力として扱う。
    // React 側の setStatePartial まで入力扱いすると、session 切替時に古い値が
    // store へ戻され、双方向同期が往復し続ける可能性がある。
    this.externalStateRevision += 1;

    if (state.activeTopic !== undefined) {
      this.state.activeTopic = state.activeTopic;
      this.actionDelegates.onChangeTopic?.(this.state.activeTopic);
    }

    this.updateView();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.updateView();
  }

  async setEditorExpansionMode(mode: EditorExpansionMode): Promise<void> {
    // 意図: 設定変更はビューからプラグインへ渡し、保存処理を Obsidian の Plugin API 側に集約する。
    this.settings = { ...this.settings, editorExpansionMode: mode };
    this.updateView();
    await this.persistEditorExpansionMode?.(mode);
  }

  /** React 側で一時的にビューアクションを差し替えた後に再描画する。 */
  refreshActions(): void {
    this.updateActions();
  }

  // -----------------------------------------------------------------------
  // Setup & Events
  // -----------------------------------------------------------------------

  private setupShortcuts(): void {
    // scope は render より先に初期化する必要がある（MagicalEditor で親スコープとして参照されるため）
    this.scope = new Scope(this.app.scope);

    this.scope.register(["Ctrl"], "f", () => {
      this.actionDelegates.onSearchInputOpen?.();
      return false;
    });

    this.scope.register(["Ctrl", "Shift", "Alt"], "o", () => {
      this.actionDelegates.onEditorExpand?.();
      return true;
    });

    this.scope.register([], "F2", () => {
      this.fixedNoteTitle.focus();
      return false;
    });
  }

  // -----------------------------------------------------------------------
  // View Rendering & Actions
  // -----------------------------------------------------------------------

  private updateView(): void {
    this.updateActions();
    this.fixedNoteTitle.update();
    this.renderReactView();
  }

  private updateActions(): void {
    this.cleanUpActions();
    const capabilities = getDaystreamViewCapabilities(this.state);

    if (capabilities.supportsSidebar) {
      this.addAction("panel-right", "インサイトを切り替え", () => {
        this.actionDelegates.onToggleRightPanel?.();
      }).setAttr("data-daystream-actions", "true");

      this.addAction("panel-left", "ナビゲーターを切り替え", () => {
        this.actionDelegates.onToggleLeftPanel?.();
      }).setAttr("data-daystream-actions", "true");
    }
  }

  private cleanUpActions(): void {
    Array.from(this.actionsEl.children)
      .filter((el) => el.getAttr("data-daystream-actions") === "true")
      .forEach((el) => el.detach());
  }

  protected renderReactView(): void {
    if (!this.root) {
      // Obsidian API: containerEl より contentEl を直接指定する方が安全
      this.root = createRoot(this.contentEl);
    }
    this.root.render(
      <ReactView
        app={this.app}
        settings={this.settings}
        view={this}
      />,
    );
  }

  private async renameFixedNote(newTitle: string): Promise<void> {
    const path = await renameFixedNoteFile(
      new ObsidianAppShell(this.app),
      this.state.file,
      newTitle,
    );
    if (!path) return;

    this.state.file = path;
    this.updateView();
  }

  private resetReactReady(): void {
    this.reactReadyPromise = new Promise<void>((resolve) => {
      this.resolveReactReady = resolve;
    });
  }
}
