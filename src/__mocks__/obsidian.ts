import type MomentFn from "moment";
import type { Plugin, TAbstractFile } from "obsidian";
import { vi } from "vitest";

export { debounce } from "es-toolkit";
// 実機の obsidian と同じく、テストでも moment を obsidian 経由の値として提供する。
const momentModule: { default: typeof MomentFn } = await import("moment");
export const moment = momentModule.default;
export const requestUrl = vi.fn<typeof import("obsidian").requestUrl>();
export const normalizePath = (p: string) => p;
export class TFile {
  basename: string;
  extension: string;
  path: string;
}
export class TFolder {}
export const Vault = {
  recurseChildren: (_folder: TFolder, _callback: (file: TAbstractFile) => void): void => {},
};

export class App {}
export class PluginSettingTab {
  constructor(
    public app: App,
    public plugin: Plugin,
  ) {}
}
export class Setting {
  constructor(public containerEl: HTMLElement) {}
  setName() {
    return this;
  }
  setDesc() {
    return this;
  }
  addText() {
    return this;
  }
  addToggle() {
    return this;
  }
  addDropdown() {
    return this;
  }
}
export class Menu {
  addItem() {
    return this;
  }
  addSeparator() {
    return this;
  }
  showAtMouseEvent() {
    return this;
  }
}
export class Notice {
  constructor(message: string) {}
}
// 意図: @22-2/obsidian-magical-editor が Modal / ItemView をインポートするためスタブが必要。
export class Modal {
  constructor(public app: unknown) {}
  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}
export class WorkspaceLeaf {}
export class ItemView {
  leaf: WorkspaceLeaf;
  constructor(leaf: WorkspaceLeaf) {
    this.leaf = leaf;
  }
  getViewType() {
    return "";
  }
  getDisplayText() {
    return "";
  }
}
export const setIcon = () => {};
// 意図: 実際の Obsidian と同様に aria-label を付与し、ラベルで要素を探すテストを成立させる。
export const setTooltip = (el: HTMLElement, tooltip: string) => {
  el.setAttribute("aria-label", tooltip);
};
