import type { WorkspaceLeaf } from "obsidian";
import { ItemView, Menu, Scope, Setting, TFile } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { ensureExtension } from "src/core/path";
import type { Settings } from "src/settings";
import { EditableTitleBar } from "src/ui/components/common/EditableTitleBar";
import { ReactView } from "src/ui/components/layout/ReactView";
import { addPeriodMenuItems } from "src/ui/menus/periodMenu";
import "src/ui/styles/global.css";
import "src/ui/styles/mfdi.css";
import type { MFDIActionDelegate } from "src/ui/view/MFDIViewHandler";
import type { MFDIViewState } from "src/ui/view/state";
import {
  DEFAULT_MFDI_VIEW_STATE,
  getFixedNoteTitle,
  getMFDIViewCapabilities,
} from "src/ui/view/state";

export const VIEW_TYPE_MFDI = "mfdi-view";

export class MFDIView extends ItemView {
  private editableTitleBar: EditableTitleBar | null = null;
  private root: Root | null = null;
  private settings: Settings;
  private state: MFDIViewState = { ...DEFAULT_MFDI_VIEW_STATE };
  private externalStateRevision = 0;

  // 検索入力用コントロール
  private activeSearchControlEl: HTMLElement | null = null;
  private searchInputEl: HTMLInputElement | null = null;
  private isSearchToggleFromAction = false;

  public navigation = false;
  public readonly actionDelegates: MFDIActionDelegate = {};

  constructor(leaf: WorkspaceLeaf, settings: Settings) {
    super(leaf);
    this.settings = settings;
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
    this.setupShortcuts();
    this.setupWorkspaceEvents();

    // fixedノートを開いたときなど、すぐに render せずに少し待つ。
    // 状態の反映が不完全なまま描画されるのを防ぐため。
    window.setTimeout(() => this.updateView());
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }

  onPaneMenu(menu: Menu, prev: string): void {
    this.addFixedNoteMenuItems(menu);
    this.addViewMenuItems(menu);
    this.addPeriodMenuItemsIfSupported(menu);
    this.addDeleteFixedNoteMenuItem(menu);

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

  public openSearchInput(): void {
    this.ensureSearchControl();
    if (!this.activeSearchControlEl) return;

    this.activeSearchControlEl.style.display = "block";
    window.setTimeout(() => {
      this.searchInputEl?.focus();
    });
  }

  public closeSearchInput(): void {
    if (!this.activeSearchControlEl) return;
    this.activeSearchControlEl.style.display = "none";
  }

  // -----------------------------------------------------------------------
  // Setup & Events
  // -----------------------------------------------------------------------

  private setupShortcuts(): void {
    // scope は render より先に初期化する必要がある（MagicalEditor で親スコープとして参照されるため）
    this.scope = new Scope(this.app.scope);

    // this.scope.register(["Ctrl"], "Enter", () => {
    //   this.actionDelegates.onSubmit?.();
    //   return false;
    // });

    this.scope.register(["Ctrl"], "f", () => {
      this.actionDelegates.onSearchInputOpen?.();
      return false;
    });

    this.scope.register(["Ctrl", "Shift", "Alt"], "o", () => {
      this.actionDelegates.onEditorExpand?.();
      return true;
    });

    this.scope.register([], "F2", () => {
      this.editableTitleBar?.focus();
      return false;
    });

    // 検索入力がフォーカスされているときに Escape キーで閉じる
    this.scope.register([], "Escape", () => {
      if (document.activeElement === this.searchInputEl) {
        this.actionDelegates.onSearchInputClose?.();
        this.closeSearchInput();
        return true;
      }
      return false;
    });
  }

  private setupWorkspaceEvents(): void {
    // registerEvent を使用して onClose 時のメモリリークを防止
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf?.id === this.leaf.id) {
          this.actionDelegates.onFocusRequested?.();
        }
      }),
    );
  }

  // -----------------------------------------------------------------------
  // View Rendering & Actions
  // -----------------------------------------------------------------------

  private updateView(): void {
    this.updateActions();
    this.updateEditableTitleBar();
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

    this.buildSearchAction();
  }

  private cleanUpActions(): void {
    Array.from(this.actionsEl.children)
      .filter((el) => el.getAttr("data-mfdi-actions") === "true")
      .forEach((el) => el.detach());
  }

  private ensureSearchControl(): void {
    if (this.activeSearchControlEl) return;

    const searchSetting = new Setting(createDiv()).addSearch((search) => {
      this.searchInputEl = search.inputEl;
      search.setValue(this.state.searchQuery ?? "");
      search.onChange((value) => {
        this.state.searchQuery = value;
        this.actionDelegates.onSearchQueryChange?.(value);
      });

      search.inputEl.addEventListener("blur", () => {
        if (this.isSearchToggleFromAction) return;
        this.actionDelegates.onSearchInputClose?.();
        this.closeSearchInput();
      });
    });

    this.activeSearchControlEl = searchSetting.controlEl;
    this.activeSearchControlEl.style.display = "none";
    this.actionsEl.prepend(this.activeSearchControlEl);
  }

  private buildSearchAction(): void {
    const searchActionEl = this.addAction("search", "検索切り替え", () => {
      const isHidden =
        this.activeSearchControlEl?.style.display === "none" ||
        !this.activeSearchControlEl;

      if (isHidden) {
        this.actionDelegates.onSearchInputOpen?.();
        this.openSearchInput();
      } else {
        this.actionDelegates.onSearchInputClose?.();
        this.closeSearchInput();
      }
      this.isSearchToggleFromAction = false;
    });

    searchActionEl.addEventListener("mousedown", () => {
      if (this.activeSearchControlEl?.style.display !== "none") {
        this.isSearchToggleFromAction = true;
      }
    });

    searchActionEl.setAttr("data-mfdi-actions", "true");
    searchActionEl.addEventListener(
      "contextmenu",
      this.onSearchContextMenu.bind(this),
    );
  }

  private onSearchContextMenu(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const menu = new Menu();
    const applySearchKindFilter = (threadOnly: boolean) => {
      this.state.threadOnly = threadOnly;
      this.actionDelegates.onChangeThreadOnly?.(threadOnly);
    };

    menu.addItem((item) =>
      item
        .setTitle("すべて")
        .setChecked(!this.state.threadOnly)
        .onClick(() => applySearchKindFilter(false)),
    );
    menu.addSeparator();
    menu.addItem((item) =>
      item
        .setTitle("スレッドのみ")
        .setChecked(this.state.threadOnly)
        .onClick(() => applySearchKindFilter(true)),
    );

    menu.showAtMouseEvent(e);
  }

  private updateEditableTitleBar(): void {
    if (this.state.noteMode !== "fixed") return;

    if (!this.editableTitleBar) {
      this.editableTitleBar = new EditableTitleBar(this, {
        scope: new Scope(this.app.scope),
        getTitle: () => getFixedNoteTitle(this.state.file),
        onSubmitTitle: async (newTitle: string) => {
          if (!this.state.file || !newTitle.trim()) return;

          const file = this.app.vault.getAbstractFileByPath(this.state.file);
          if (!(file instanceof TFile)) return;

          await this.app.fileManager.renameFile(
            file,
            ensureExtension(newTitle, ".mfdi.md"),
          );

          this.state.file = file.path;
          this.updateView();
        },
      });
    }

    this.editableTitleBar.render();
  }

  private renderReactView(): void {
    if (!this.root) {
      // Obsidian API: containerEl より contentEl を直接指定する方が安全
      this.root = createRoot(this.contentEl);
    }
    this.root.render(
      <ReactView app={this.app} settings={this.settings} view={this} />,
    );
  }

  // -----------------------------------------------------------------------
  // Menu Builders
  // -----------------------------------------------------------------------

  private addFixedNoteMenuItems(menu: Menu): void {
    if (this.state.displayMode === "timeline") return;

    menu.addItem((item) =>
      item
        .setTitle("現在のノートを開く")
        .setIcon("external-link")
        .onClick(() => this.actionDelegates.onOpenDailyNoteAction?.()),
    );
  }

  private addViewMenuItems(menu: Menu): void {
    const capabilities = getMFDIViewCapabilities(this.state);

    menu.addItem((item) =>
      item
        .setTitle("すべてのメッセージをコピー")
        .setIcon("copy")
        .onClick(() => this.actionDelegates.onCopyAllPosts?.()),
    );

    menu.addSeparator();
    menu.addItem((item) =>
      item.setTitle("ビュー").setIcon("panels-top-left").setDisabled(true),
    );

    menu.addItem((item) =>
      item
        .setTitle("下書きを管理")
        .setIcon("library")
        .onClick(() => this.actionDelegates.onOpenDraftList?.()),
    );

    if (capabilities.supportsDisplayModeSwitch) {
      const isFocus = this.state.displayMode === "focus";
      menu.addItem((item) =>
        item
          .setTitle(isFocus ? "フォーカスモード" : "タイムラインモード")
          .setIcon(isFocus ? "toggle-left" : "toggle-right")
          .onClick(() =>
            this.actionDelegates.onChangeDisplayMode?.(
              isFocus ? "timeline" : "focus",
            ),
          ),
      );
    }

    menu.addItem((item) =>
      item
        .setTitle(this.state.asTask ? "タスクモード" : "メッセージモード")
        .setIcon(this.state.asTask ? "toggle-left" : "toggle-right")
        .onClick(() =>
          this.actionDelegates.onChangeAsTask?.(!this.state.asTask),
        ),
    );
  }

  private addPeriodMenuItemsIfSupported(menu: Menu): void {
    const capabilities = getMFDIViewCapabilities(this.state);
    if (!capabilities.supportsPeriodMenus) return;
    if (this.state.displayMode !== "focus") return;

    addPeriodMenuItems(menu, this.state, {
      onChangeTimeFilter: (f) => this.actionDelegates.onChangeTimeFilter?.(f),
      onChangeDateFilter: (f) => this.actionDelegates.onChangeDateFilter?.(f),
    });
  }

  private addDeleteFixedNoteMenuItem(menu: Menu): void {
    if (this.state.noteMode !== "fixed") return;

    menu.addSeparator();
    menu.addItem((item) => {
      item
        .setTitle("削除")
        .setIcon("trash")
        .setWarning(true)
        .onClick(async () => {
          if (!this.state.file) return;
          const file = this.app.metadataCache.getFirstLinkpathDest(
            this.state.file,
            "",
          );
          if (file instanceof TFile) {
            await this.app.fileManager.trashFile(file);
          }
        });
    });
  }
}
