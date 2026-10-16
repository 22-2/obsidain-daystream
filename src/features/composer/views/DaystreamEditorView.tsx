import type { WorkspaceLeaf } from "obsidian";
import { ItemView, Scope } from "obsidian";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import type { Settings } from "src/core/domain/settings";
import { EditorOnlyReactView } from "src/features/composer/components/EditorOnlyReactView";
import type { PersistedEditingPost } from "src/features/composer/store/slices/editorSlice";
import "src/core/ui/styles/global.css";
import "src/core/ui/styles/daystream.css";

export const VIEW_TYPE_DAYSTREAM_EDITOR = "mfdi-editor-view";

// popout ウィンドウへ渡すシリアライズ済みの状態
// Post の Moment フィールドは ISO 文字列に変換して Record 互換にする
export interface DaystreamEditorViewState extends Record<string, unknown> {
  postInfo?: PersistedEditingPost;
  message?: string;
  draftMetadata?: Record<string, string>;
  draftMetadataBase?: Record<string, string>;
}

export class DaystreamEditorView extends ItemView {
  private root: Root | null = null;
  private settings: Settings;
  private state: DaystreamEditorViewState | null = null;
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
    return VIEW_TYPE_DAYSTREAM_EDITOR;
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

  async setState(state: DaystreamEditorViewState): Promise<void> {
    this.state = state;
    this.setupView();
  }

  getState(): DaystreamEditorViewState {
    return this.state || ({} as DaystreamEditorViewState);
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
