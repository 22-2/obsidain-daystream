import type { WorkspaceLeaf } from "obsidian";
import { ItemView, Menu, Scope } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { renameFixedNote as renameFixedNoteFile, trashFixedNote } from "src/core/fixed-note";
import type { Settings } from "src/settings";
import { ObsidianAppShell } from "src/shell/obsidian-shell";
import { ReactView } from "src/ui/components/layout/ReactView";
import { addMFDIPaneMenuItems } from "src/ui/menus/mfdiPaneMenu";
import "src/ui/styles/global.css";
import "src/ui/styles/mfdi.css";
import type { MFDIViewDelegates } from "src/ui/view/MFDIViewHandler";
import { MFDIFixedNoteTitle } from "src/ui/view/MFDIFixedNoteTitle";
import type { MFDIViewState } from "src/ui/view/state";
import {
  DEFAULT_MFDI_VIEW_STATE,
  getFixedNoteTitle,
  getMFDIViewCapabilities,
} from "src/ui/view/state";

export const VIEW_TYPE_MFDI = "mfdi-view";

export class MFDIView extends ItemView {
  private root: Root | null = null;
  private settings: Settings;
  private state: MFDIViewState = { ...DEFAULT_MFDI_VIEW_STATE };
  private externalStateRevision = 0;
  private readonly fixedNoteTitle: MFDIFixedNoteTitle;
  private reactReadyPromise: Promise<void>;
  private resolveReactReady: (() => void) | null = null;
  private hasOpened = false;

  public navigation = false;
  public readonly actionDelegates: MFDIViewDelegates = {};

  constructor(leaf: WorkspaceLeaf, settings: Settings) {
    super(leaf);
    this.settings = settings;
    this.fixedNoteTitle = new MFDIFixedNoteTitle(
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
    return VIEW_TYPE_MFDI;
  }

  getDisplayText(): string {
    if (this.state.noteMode === "fixed") {
      return `MFDI: ${getFixedNoteTitle(this.state.file)}`;
    }
    return "Mobile First Daily Interface";
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
    addMFDIPaneMenuItems(menu, {
      getState: () => this.state,
      actionDelegates: this.actionDelegates,
      onDeleteFixedNote: () => this.deleteFixedNote(),
    });

    super.onPaneMenu(menu, prev);
  }

  // -----------------------------------------------------------------------
  // State Management
  // -----------------------------------------------------------------------

  getState(): MFDIViewState {
    return this.state;
  }

  getExternalStateRevision(): number {
    return this.externalStateRevision;
  }

  setStatePartial(patch: Partial<MFDIViewState>): void {
    this.state = {
      ...this.state,
      ...patch,
      noteMode: patch.noteMode ?? this.state.noteMode,
      file: patch.file !== undefined ? patch.file : this.state.file,
    };
  }

  async setState(state: MFDIViewState): Promise<void> {
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
    const capabilities = getMFDIViewCapabilities(this.state);

    if (capabilities.supportsSidebar) {
      this.addAction("panel-right", "インサイトを切り替え", () => {
        this.actionDelegates.onToggleRightPanel?.();
      }).setAttr("data-mfdi-actions", "true");

      this.addAction("panel-left", "ナビゲーターを切り替え", () => {
        this.actionDelegates.onToggleLeftPanel?.();
      }).setAttr("data-mfdi-actions", "true");
    }
  }

  private cleanUpActions(): void {
    Array.from(this.actionsEl.children)
      .filter((el) => el.getAttr("data-mfdi-actions") === "true")
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

  private async deleteFixedNote(): Promise<void> {
    await trashFixedNote(new ObsidianAppShell(this.app), this.state.file);
  }

  private resetReactReady(): void {
    this.reactReadyPromise = new Promise<void>((resolve) => {
      this.resolveReactReady = resolve;
    });
  }
}
