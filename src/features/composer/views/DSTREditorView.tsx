import type { WorkspaceLeaf } from "obsidian";
import { ItemView, Scope } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import type { Settings } from "src/core/domain/settings";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";
import { VIEW_TYPE_DSTR_EDITOR } from "src/core/view-types";
import { EditorOnlyReactView } from "src/features/composer/components/EditorOnlyReactView";
import type { PersistedEditingPost } from "src/features/composer/store/slices/editorSlice";
import "src/core/ui/styles/global.css";
import "src/core/ui/styles/dstr.css";

export { VIEW_TYPE_DSTR_EDITOR };

// popout ウィンドウへ渡すシリアライズ済みの状態
// Post の Moment フィールドは ISO 文字列に変換して Record 互換にする
export interface DSTREditorViewState extends Record<string, unknown> {
  postInfo?: PersistedEditingPost;
  message?: string;
  draftMetadata?: Record<string, string>;
  draftMetadataBase?: Record<string, string>;
}

export class DSTREditorView extends ItemView {
  private root: Root | null = null;
  private settings: Settings;
  private state: DSTREditorViewState | null = null;
  // popout ウィンドウでは navigation ヘッダが不要
  public navigation: boolean = false;

  constructor(leaf: WorkspaceLeaf, settings: Settings) {
    super(leaf);
    this.settings = settings;
  }

  // -----------------------------------------------------------------------
  // ItemView overrides
  // -----------------------------------------------------------------------

  getIcon(): string {
    return "pencil";
  }

  getViewType(): string {
    // 意図: Obsidian の基底コンストラクタからも呼ばれるため、インスタンス初期化前に確定する型を返す。
    return VIEW_TYPE_DSTR_EDITOR;
  }

  getDisplayText(): string {
    return "Daystream エディタ";
  }

  async onOpen(): Promise<void> {
    // scope は MagicalEditor が親スコープとして参照するため先に設定する
    this.scope = new Scope(this.app.scope);
    // 初回 setState より前に onOpen が走ることもあるため、空状態でも描画する
    window.setTimeout(() => this.setupView());
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }

  // -----------------------------------------------------------------------
  // State management
  // -----------------------------------------------------------------------

  async setState(state: DSTREditorViewState): Promise<void> {
    this.state = state;
    this.setupView();
  }

  getState(): DSTREditorViewState {
    return this.state || ({} as DSTREditorViewState);
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private setupView(): void {
    if (!this.root) {
      this.root = createRoot(this.containerEl.children[1]);
    }
    this.root.render(
      <EditorOnlyReactView
        app={this.app}
        settings={this.settings}
        view={this}
        initialState={this.state}
      />,
    );
  }
}

export class LegacyDSTREditorView extends DSTREditorView {
  override getViewType(): string {
    return LEGACY_DAYSTREAM_IDENTIFIERS.editorViewType;
  }
}
