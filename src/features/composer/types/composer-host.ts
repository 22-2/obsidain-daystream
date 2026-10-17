import type { Component, ItemView, WorkspaceLeaf } from "obsidian";
import type { EditorExpansionMode } from "src/core/domain/settings";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";
import { VIEW_TYPE_DSTR_EDITOR } from "src/core/view-types";

/**
 * composer が利用する Daystream view の最小インターフェース。
 * 意図: composer から workspace の view 実装クラスへ直接依存しないよう、必要な操作だけを型で受け取る。
 */
export interface ComposerHostView extends ItemView {
  setEditorExpansionMode(mode: EditorExpansionMode): Promise<void>;
  refreshActions(): void;
}

interface ComposerAction {
  setAttr(name: string, value: string): void;
  detach(): void;
}

export type ComposerLeafHost = Component & {
  addAction(
    icon: Parameters<ItemView["addAction"]>[0],
    title: string,
    callback: (event: MouseEvent) => void,
  ): ComposerAction;
  leaf: WorkspaceLeaf;
};

export function isComposerLeafHost(component: Component): component is ComposerLeafHost {
  const getViewType: unknown = Reflect.get(component, "getViewType");
  const leaf: unknown = Reflect.get(component, "leaf");
  const viewType: unknown =
    typeof getViewType === "function" ? (Reflect.apply(getViewType, component, []) as unknown) : null;
  return (
    (viewType === VIEW_TYPE_DSTR_EDITOR ||
      viewType === LEGACY_DAYSTREAM_IDENTIFIERS.editorViewType) &&
    typeof leaf === "object" &&
    leaf !== null &&
    typeof Reflect.get(leaf, "detach") === "function" &&
    typeof Reflect.get(component, "addAction") === "function"
  );
}

export function isComposerHostView(component: Component): component is ComposerHostView {
  const leaf: unknown = Reflect.get(component, "leaf");
  return (
    typeof leaf === "object" &&
    leaf !== null &&
    typeof Reflect.get(leaf, "detach") === "function" &&
    typeof Reflect.get(component, "setEditorExpansionMode") === "function" &&
    typeof Reflect.get(component, "refreshActions") === "function"
  );
}
