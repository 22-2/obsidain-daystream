import type { App } from "obsidian";
import { DaystreamBaseModal } from "src/features/composer/modals/DaystreamBaseModal";

export interface DiscardConfirmResult {
  confirmed: boolean;
  neverShowAgain: boolean;
}

/**
 * 入力内容の破棄を確認するモーダル。
 * 「二度と表示しない」チェックで次回以降の確認をスキップできる。
 */
export class DiscardConfirmModal extends DaystreamBaseModal<DiscardConfirmResult> {
  private result: DiscardConfirmResult = {
    confirmed: false,
    neverShowAgain: false,
  };

  constructor(app: App) {
    super(app, "変更を破棄しますか？");
  }

  renderBody(bodyEl: HTMLElement): void {
    this.result = { confirmed: false, neverShowAgain: false };

    bodyEl.createEl("p", {
      text: "編集中の内容は失われます。本当に閉じますか？",
    });

    // 「二度と表示しない」チェックボックス
    const checkRow = bodyEl.createDiv({ cls: "daystream-modal__checkbox-row" });
    const checkboxId = "daystream-discard-never-show";
    const checkbox = checkRow.createEl("input", {
      type: "checkbox",
      attr: { id: checkboxId },
    });
    checkRow.createEl("label", {
      text: "二度と表示しない",
      attr: { for: checkboxId },
    });
    checkbox.addEventListener("change", () => {
      this.result.neverShowAgain = checkbox.checked;
    });

    const actionsEl = this.createActions(bodyEl);
    this.createButton(actionsEl, "キャンセル", () => this.close());
    this.createButton(
      actionsEl,
      "破棄",
      () => {
        this.result.confirmed = true;
        this.close();
      },
      { warning: true },
    );
  }

  onClose(): void {
    super.onClose();
    this.resolvePromise?.(this.result);
  }
}
