import type { App } from "obsidian";
import { MFDIBaseModal } from "src/ui/modals/MFDIBaseModal";

export interface InputModalArgs {
  title: string;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
  onSubmit?: (value: string) => boolean | void | Promise<boolean | void>;
}

export async function showInputModal(app: App, args: InputModalArgs): Promise<string | null> {
  return new InputModal(
    app,
    args.title,
    args.placeholder,
    args.defaultValue,
    args.submitLabel,
    args.onSubmit,
  ).show();
}

class InputModal extends MFDIBaseModal<string | null> {
  private inputEl!: HTMLInputElement;
  private cancelButtonEl!: HTMLButtonElement;
  private submitButtonEl!: HTMLButtonElement;
  private submitted = false;
  private isSubmitting = false;

  constructor(
    app: App,
    titleText: string,
    private placeholder?: string,
    private defaultValue?: string,
    private submitLabel = "決定",
    private submitAction?: InputModalArgs["onSubmit"],
  ) {
    super(app, titleText);
  }

  renderBody(bodyEl: HTMLElement): void {
    this.submitted = false;
    this.inputEl = bodyEl.createEl("input", { cls: "mfdi-modal__input" });
    this.inputEl.type = "text";
    this.inputEl.placeholder = this.placeholder ?? "";
    if (this.defaultValue) this.inputEl.value = this.defaultValue;

    const actionsEl = this.createActions(bodyEl);
    this.cancelButtonEl = this.createButton(actionsEl, "キャンセル", () => this.close());
    this.submitButtonEl = this.createButton(actionsEl, this.submitLabel, () => void this.submit(), {
      cta: true,
    });

    this.inputEl.addEventListener("keydown", (ev) => {
      if (ev.isComposing) return;
      if (ev.key === "Enter") {
        ev.preventDefault();
        void this.submit();
      }
    });

    queueMicrotask(() => this.inputEl.focus());
  }

  private async submit(): Promise<void> {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.inputEl.disabled = true;
    this.cancelButtonEl.disabled = true;
    this.submitButtonEl.disabled = true;

    try {
      const result = await this.submitAction?.(this.inputEl.value);
      if (result === false) return;

      this.submitted = true;
      this.close();
    } catch (error) {
      console.error("Failed to submit input modal:", error);
    } finally {
      this.isSubmitting = false;
      if (this.modalEl.isConnected) {
        this.inputEl.disabled = false;
        this.cancelButtonEl.disabled = false;
        this.submitButtonEl.disabled = false;
        this.inputEl.focus();
      }
    }
  }

  onClose(): void {
    super.onClose();
    this.resolvePromise?.(this.submitted ? (this.inputEl?.value ?? "") : null);
  }
}
