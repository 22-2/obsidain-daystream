import type { App } from "obsidian";
import { DISPLAY_DATE_TIME_FORMAT } from "src/features/workspace/config/date-formats";
import { DaystreamBaseModal } from "src/features/composer/modals/DaystreamBaseModal";
import type { Post } from "src/core/domain/post";
import { isPinned } from "src/core/domain/post-metadata";

export interface BacklinkPreviewModalOptions {
  targetPost: Post;
  sourcePosts: Post[];
  onSelectPost: (post: Post) => void | Promise<void>;
}

export function buildBacklinkPreviewText(message: string): string {
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return "(本文なし)";
  }

  const previewLines = lines.slice(0, 2);
  if (lines.length > 2) {
    previewLines[previewLines.length - 1] = `${previewLines[previewLines.length - 1]} …`;
  }

  return previewLines.join("\n");
}

export function openBacklinkPreviewModal(
  app: App,
  options: BacklinkPreviewModalOptions,
): BacklinkPreviewModal {
  const modal = new BacklinkPreviewModal(app, options);
  modal.open();
  return modal;
}

class BacklinkPreviewModal extends DaystreamBaseModal<void> {
  constructor(
    app: App,
    private readonly options: BacklinkPreviewModalOptions,
  ) {
    super(
      app,
      `${options.targetPost.timestamp.format(DISPLAY_DATE_TIME_FORMAT)} の被リンク ${options.sourcePosts.length}件`,
    );
  }

  onOpen(): void {
    super.onOpen();
    this.modalEl.addClass("daystream-backlink-preview-modal");
  }

  renderBody(bodyEl: HTMLElement): void {
    bodyEl.createDiv({
      cls: "daystream-backlink-preview__summary",
      text: "参照元をクリックすると、その日の focused モードで開いて該当投稿をハイライトします。",
    });

    bodyEl.createDiv({
      cls: "daystream-backlink-preview__section-title",
      text: "参照されている投稿",
    });
    const targetEl = bodyEl.createDiv({ cls: "daystream-backlink-preview__target" });
    this.renderStaticItem(targetEl, this.options.targetPost);

    bodyEl.createDiv({
      cls: "daystream-backlink-preview__section-title",
      text: `参照元 ${this.options.sourcePosts.length}件`,
    });

    const listEl = bodyEl.createDiv({ cls: "daystream-backlink-preview__list" });
    if (this.options.sourcePosts.length === 0) {
      listEl.createDiv({
        cls: "daystream-backlink-preview__empty",
        text: "参照元が見つかりませんでした。",
      });
    } else {
      this.options.sourcePosts.forEach((post) => {
        this.renderItem(listEl, post);
      });
    }

    const actionsEl = this.createActions(bodyEl);
    this.createButton(actionsEl, "閉じる", () => this.close());

    queueMicrotask(() => {
      listEl.querySelector<HTMLElement>("button")?.focus();
    });
  }

  onClose(): void {
    this.modalEl.removeClass("daystream-backlink-preview-modal");
    super.onClose();
  }

  private renderItem(container: HTMLElement, post: Post): void {
    const buttonEl = container.createEl("button", {
      cls: "daystream-backlink-preview__item",
      type: "button",
    });

    buttonEl.addEventListener("click", () => {
      // 意図: modal を閉じてから jump することで、
      // 新しい leaf を開いた時に modal が前面へ残る違和感を防ぐ。
      this.close();
      void this.options.onSelectPost(post);
    });

    this.renderItemContent(buttonEl, post);
  }

  private renderStaticItem(container: HTMLElement, post: Post): void {
    const itemEl = container.createDiv({
      cls: "daystream-backlink-preview__item daystream-backlink-preview__item--target",
    });
    this.renderItemContent(itemEl, post);
  }

  private renderItemContent(container: HTMLElement, post: Post): void {
    const metaEl = container.createDiv({ cls: "daystream-backlink-preview__meta" });
    metaEl.createDiv({
      cls: "daystream-backlink-preview__time",
      text: post.timestamp.format(DISPLAY_DATE_TIME_FORMAT),
    });

    if (isPinned(post.metadata)) {
      metaEl.createDiv({
        cls: "daystream-backlink-preview__badge",
        text: "ピン留め",
      });
    }

    container.createDiv({
      cls: "daystream-backlink-preview__path",
      text: post.path,
    });
    container.createDiv({
      cls: "daystream-backlink-preview__preview",
      text: buildBacklinkPreviewText(post.message),
    });
  }
}
