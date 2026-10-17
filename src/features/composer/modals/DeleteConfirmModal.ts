import type { App } from "obsidian";
import { DSTRBaseModal } from "src/features/composer/modals/DSTRBaseModal";

export async function showDeleteConfirmModal(
  app: App,
  args: {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
  } = {},
): Promise<boolean> {
  return new DeleteConfirmModal(
    app,
    args.title || "削除確認",
    args.message || "この項目を削除しますか？",
    args.confirmText || "削除",
    args.cancelText || "キャンセル",
    args.isDestructive ?? true,
  ).show();
}

export class DeleteConfirmModal extends DSTRBaseModal<boolean> {
  private confirmed = false;
  private message: string | (() => Promise<void>);
  private confirmText: string;
  private cancelText: string;
  private isDestructive: boolean;

  constructor(app: App, onConfirm: () => Promise<void>);
  constructor(
    app: App,
    title: string,
    message: string,
    confirmText?: string,
    cancelText?: string,
    isDestructive?: boolean,
  );
  constructor(
    app: App,
    titleOrConfirm: string | (() => Promise<void>),
    message?: string,
    confirmText: string = "削除",
    cancelText: string = "キャンセル",
    isDestructive: boolean = true,
  ) {
    if (typeof titleOrConfirm === "function") {
      super(app, "削除確認");
      this.message = titleOrConfirm;
      this.confirmText = "削除";
      this.cancelText = "キャンセル";
      this.isDestructive = true;
    } else {
      super(app, titleOrConfirm);
      this.message = message || "この項目を削除しますか？";
      this.confirmText = confirmText;
      this.cancelText = cancelText;
      this.isDestructive = isDestructive;
    }
  }

  renderBody(bodyEl: HTMLElement): void {
    this.confirmed = false;

    if (typeof this.message === "string") {
      bodyEl.createEl("p", { text: this.message });
    } else {
      // Default message if we're using the callback style
      bodyEl.createEl("p", { text: "この項目を削除しますか？" });
    }

    const actionsEl = this.createActions(bodyEl);
    this.createButton(actionsEl, this.cancelText, () => this.close());
    this.createButton(
      actionsEl,
      this.confirmText,
      async () => {
        this.confirmed = true;
        if (typeof this.message === "function") {
          await this.message();
        }
        this.close();
      },
      { warning: this.isDestructive, cta: !this.isDestructive },
    );
  }

  onClose(): void {
    super.onClose();
    this.resolvePromise?.(this.confirmed);
  }
}
