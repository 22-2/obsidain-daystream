import { ModalEditor } from "@22-2/obsidian-magical-editor";
import type { App, EditorPosition } from "obsidian";
import { Scope } from "obsidian";
import { createElement } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { InputAreaFooterBase } from "src/ui/components/inputarea/InputAreaFooterBase";
import { PLACEHOLDER_TEXT } from "src/ui/config/consntants";

export interface MFDIEditorModalOptions {
  initialContent: string;
  onChange: (content: string) => void;
  onClose: (content: string) => void;
  /** 投稿が有効なときだけダイアログを閉じる。false を返すと開いたままにする。 */
  onSubmit?: (content: string) => boolean | void | Promise<boolean | void>;
  /** フッターの投稿ボタンを有効にするか判定する。 */
  canSubmit?: (content: string) => boolean;
  /** 編集時など、フッターに表示する送信ラベル。 */
  submitLabel?: string;
}

type EditorWithMousePosition = {
  posAtMouse: (event: MouseEvent) => EditorPosition | null;
  setCursor: (position: EditorPosition) => void;
  focus: () => void;
};

export class MFDIEditorModal extends ModalEditor {
  private readonly modalOptions: MFDIEditorModalOptions;
  private readonly submissionState: { submitted: boolean };
  private footerRoot: Root | null = null;
  private unsubscribeContent: (() => void) | null = null;
  private readonly handleSizerMouseDown = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(".cm-sizer")) return;

    const editor = this.editor?.editor as EditorWithMousePosition | undefined;
    const position = editor?.posAtMouse(event);
    if (!editor || !position) return;

    // CodeMirror の空白領域を押した位置へカーソルを置いてからフォーカスする。
    // 描画後に反映することで、標準のマウス選択処理とも競合しないようにする。
    window.requestAnimationFrame(() => {
      if (!this.modalEl.isConnected) return;
      editor.setCursor(position);
      editor.focus();
    });
  };

  constructor(app: App, options: MFDIEditorModalOptions) {
    const submissionState = { submitted: false };
    super(app, {
      initialContent: options.initialContent,
      onChange: options.onChange,
      onClose: (content) => {
        if (!submissionState.submitted) options.onClose(content);
      },
      placeholder: PLACEHOLDER_TEXT,
    });
    this.modalOptions = options;
    this.submissionState = submissionState;
    this.modalEl.addClass("mfdi-modal-editor");

    this.scope = new Scope(this.app.scope as Scope);
    const close = () => {
      this.close();
      return true;
    };
    // Ctrl+Shift+Alt+O で閉じる（thino-extension と同様）
    this.scope.register(["Ctrl", "Shift", "Alt"], "o", close);
    this.scope.register([], "Escape", close);
  }

  async onOpen(): Promise<void> {
    await super.onOpen();
    this.titleEl.empty();
    this.titleEl.style.display = "none";
    this.contentEl.addEventListener(
      "mousedown",
      this.handleSizerMouseDown,
      true,
    );

    const footer = this.contentEl.createDiv({
      cls: "mfdi-editor-modal__footer",
    });
    this.footerRoot = createRoot(footer);
    this.unsubscribeContent = this.subscribeContent((content) => {
      this.renderFooter(content);
    });
    this.renderFooter(this.getContent());
  }

  private renderFooter(content: string): void {
    if (!this.footerRoot) return;

    const canSubmit =
      this.modalOptions.canSubmit?.(content) ?? content.trim().length > 0;

    this.footerRoot.render(
      createElement(InputAreaFooterBase, {
        className: "mfdi-input-area-footer mfdi-editor-modal__footer-content",
        canSubmit,
        submitAriaLabel: this.modalOptions.submitLabel ?? "投稿",
        submitLabel: createElement(ObsidianIcon, {
          name: "send-horizontal",
          size: "1em",
          className: canSubmit
            ? "pointer-events-none cursor-default text-[var(--text-on-accent)]"
            : "pointer-events-none cursor-default",
        }),
        onSubmit: () => {
          const currentContent = this.getContent();
          void Promise.resolve(
            this.modalOptions.onSubmit?.(currentContent),
          ).then((result) => {
            if (result === false) return;
            this.submissionState.submitted = true;
            this.close();
          });
        },
        characterCount: content.length,
      }),
    );
  }

  onClose() {
    // 投稿成功時は submit 側でストアを確定させるため、onClose で内容を
    // 下書きへ戻さない。キャンセル／×閉じる場合だけ最終内容を保持する。
    this.contentEl.removeEventListener(
      "mousedown",
      this.handleSizerMouseDown,
      true,
    );
    this.unsubscribeContent?.();
    this.unsubscribeContent = null;
    this.footerRoot?.unmount();
    this.footerRoot = null;
    super.onClose();
  }
}
