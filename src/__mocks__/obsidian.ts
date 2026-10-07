export { debounce } from "es-toolkit";
export const normalizePath = (p: string) => p;
export class TFile {
  basename: string;
  extension: string;
  path: string;
}
export class TFolder {}
export const Vault = {
  recurseChildren: (folder: any, callback: any) => {},
};

export class App {}
export class PluginSettingTab {
  constructor(
    public app: any,
    public plugin: any,
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
