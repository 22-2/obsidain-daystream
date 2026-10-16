import type { ItemView } from "obsidian";
import type { EditorExpansionMode } from "src/core/domain/settings";

/**
 * composer が利用する Daystream view の最小インターフェース。
 * 意図: composer から workspace の view 実装クラスへ直接依存しないよう、必要な操作だけを型で受け取る。
 */
export interface ComposerHostView extends ItemView {
  setEditorExpansionMode(mode: EditorExpansionMode): Promise<void>;
  refreshActions(): void;
}
