import type { App } from "obsidian";
import { Modal } from "obsidian";

export abstract class MFDIBaseModal<T = void> extends Modal {
  protected resolvePromise!: (value: T) => void;

  constructor(
    app: App,
    protected titleText: string,
  ) {
    super(app);
  }

  show(): Promise<T> {
    return new Promise<T>((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen(): void {
    this.modalEl.addClass("mfdi-modal");
    this.contentEl.empty();
    this.titleEl.setText(this.titleText);

    const bodyEl = this.contentEl.createDiv({ cls: "mfdi-modal__body" });
    this.renderBody(bodyEl);
  }

  abstract renderBody(bodyEl: HTMLElement): void;

  protected createActions(bodyEl: HTMLElement): HTMLElement {
    return bodyEl.createDiv({ cls: "mfdi-modal__actions" });
  }

  protected createButton(
    container: HTMLElement,
    text: string,
    onClick: () => void,
    options: { cta?: boolean; warning?: boolean } = {},
  ): HTMLButtonElement {
    let cls = "mfdi-modal__button";
    if (options.cta) cls += " mod-cta";
    if (options.warning) cls += " mod-warning";

    const button = container.createEl("button", {
      cls,
      text,
      type: "button",
    });
    button.addEventListener("click", onClick);
    return button;
  }

  onClose(): void {
    this.modalEl.removeClass("mfdi-modal");
    super.onClose();
  }
}
