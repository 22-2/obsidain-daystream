import type { Scope } from "obsidian";
import { type ItemView } from "obsidian";

interface EditableItemView extends ItemView {
  getDisplayText(): string;
}

// interface Focusable {
//   focus(): void;
// }

interface EditableTitleBarOptions {
  onSubmitTitle: (newTitle: string) => Promise<void>;
  getTitle: () => string;
  scope: Scope;
}

export class EditableTitleBar {
  private readonly titleEl: HTMLElement;
  private readonly titleContainerEl: HTMLElement;
  private readonly scope: Scope;
  private suppressBlur = false;
  // private lastFocused: Focusable | undefined = undefined;

  constructor(
    private readonly view: EditableItemView,
    private readonly options: EditableTitleBarOptions,
  ) {
    this.titleEl = view.titleEl;
    this.titleContainerEl = view.titleContainerEl;
    this.scope = options.scope;
  }

  public render(): void {
    if (!(this.titleEl instanceof HTMLElement) || !(this.titleContainerEl instanceof HTMLElement)) {
      return;
    }

    this.titleEl.setAttribute("contenteditable", "true");
    this.titleEl.setCssStyles({
      cursor: "text",
      outline: "none",
      userSelect: "text",
    });
    this.titleEl.setText(this.options.getTitle());

    this.registerEvents();
  }

  public focus(): void {
    // this.lastFocused = this.view.app.workspace.activeEditor?.editor;
    this.titleEl.focus();
  }

  public setText(text: string): void {
    this.titleEl.innerText = text;
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private registerEvents(): void {
    this.view.registerDomEvent(this.titleContainerEl, "click", (evt) => {
      if (evt.target !== this.titleEl) this.focus();
    });

    this.view.registerDomEvent(this.titleEl, "focus", (evt) => this.handleFocus(evt));
    this.view.registerDomEvent(this.titleEl, "keydown", (evt) => this.handleKeyDown(evt));
    this.view.registerDomEvent(this.titleEl, "blur", () => this.handleBlur());

    this.scope.register([], "Escape", () => {
      this.escape();
      return false;
    });
  }

  private handleFocus(evt: FocusEvent): void {
    const target = evt.target as HTMLElement;
    window.setTimeout(() => {
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
    }, 0);
  }

  private async handleKeyDown(evt: KeyboardEvent): Promise<void> {
    if (evt.key === "Enter") {
      evt.preventDefault();
      await this.options.onSubmitTitle(this.titleEl.innerText.trim());
      this.titleEl.blur();
    }
  }

  private handleBlur(): void {
    if (this.suppressBlur) {
      this.suppressBlur = false;
      return;
    }
    this.setText(this.options.getTitle());
  }

  private escape(): void {
    this.suppressBlur = true;
    this.setText(this.options.getTitle());
    this.titleEl.blur();
    // if (this.lastFocused) {
    //   this.lastFocused.focus();
    // }
  }
}
