// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { obsidianMoment } from "src/core/platform/obsidian-globals";
import {
  buildBacklinkPreviewText,
  openBacklinkPreviewModal,
} from "src/features/posts/modals/BacklinkPreviewModal";
import type { Post } from "src/core/domain/post";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

type TestHTMLElement = HTMLElement & {
  addClass?: (...classNames: string[]) => void;
  removeClass?: (...classNames: string[]) => void;
  empty?: () => void;
  setText?: (text: string) => void;
  createDiv?: (options?: { cls?: string; text?: string }) => HTMLDivElement;
  createEl?: <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: { cls?: string; text?: string; type?: string },
  ) => HTMLElementTagNameMap[K];
};

type TestCreateOptions = {
  cls?: string;
  text?: string;
  type?: string;
};

function toTestCreateOptions(options: unknown): TestCreateOptions {
  return typeof options === "object" && options !== null ? options : {};
}

vi.mock("obsidian", () => {
  class Modal {
    modalEl = document.createElement("div");
    contentEl = document.createElement("div");
    titleEl = document.createElement("div");

    constructor(_app: unknown) {
      this.modalEl.append(this.titleEl, this.contentEl);
      document.body.appendChild(this.modalEl);
    }

    open() {
      this.onOpen();
    }

    close() {
      this.onClose();
      this.modalEl.remove();
    }

    onOpen() {}

    onClose() {}
  }

  return { Modal };
});

function createPost(overrides: Partial<Post>): Post {
  const timestamp = overrides.timestamp ?? obsidianMoment("2026-04-10T16:00:00.000Z");

  return {
    id: overrides.id ?? "post-1",
    threadRootId: overrides.threadRootId ?? null,
    timestamp,
    noteDate: overrides.noteDate ?? obsidianMoment("2026-04-10T00:00:00.000Z"),
    message: overrides.message ?? "message",
    metadata: overrides.metadata ?? {},
    offset: overrides.offset ?? 0,
    startOffset: overrides.startOffset ?? 0,
    endOffset: overrides.endOffset ?? 10,
    bodyStartOffset: overrides.bodyStartOffset ?? 2,
    kind: "thino",
    path: overrides.path ?? "daily/2026-04-10.md",
  };
}

beforeAll(() => {
  const proto = HTMLElement.prototype as TestHTMLElement;

  proto.addClass = function (...classNames: string[]) {
    this.classList.add(...classNames);
  };
  proto.removeClass = function (...classNames: string[]) {
    this.classList.remove(...classNames);
  };
  proto.empty = function () {
    this.replaceChildren();
  };
  proto.setText = function (text: string) {
    this.textContent = text;
  };
  proto.createDiv = function (options) {
    const normalizedOptions = toTestCreateOptions(options);
    const el = document.createElement("div");
    if (normalizedOptions.cls) {
      el.className = normalizedOptions.cls;
    }
    if (normalizedOptions.text) {
      el.textContent = normalizedOptions.text;
    }
    this.appendChild(el);
    return el;
  };
  proto.createEl = function (tag, options) {
    const normalizedOptions = toTestCreateOptions(options);
    const el = document.createElement(tag);
    if (normalizedOptions.cls) {
      el.className = normalizedOptions.cls;
    }
    if (normalizedOptions.text) {
      el.textContent = normalizedOptions.text;
    }
    if (normalizedOptions.type) {
      el.setAttribute("type", normalizedOptions.type);
    }
    this.appendChild(el);
    return el;
  };
});

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

afterAll(() => {
  const proto = HTMLElement.prototype as TestHTMLElement;

  Reflect.deleteProperty(proto, "addClass");
  Reflect.deleteProperty(proto, "removeClass");
  Reflect.deleteProperty(proto, "empty");
  Reflect.deleteProperty(proto, "setText");
  Reflect.deleteProperty(proto, "createDiv");
  Reflect.deleteProperty(proto, "createEl");
});

describe("BacklinkPreviewModal", () => {
  it("本文 preview は先頭 2 行までに整える", () => {
    expect(buildBacklinkPreviewText("first\n\nsecond\nthird")).toBe("first\nsecond …");
  });

  it("preview item をクリックすると callback を呼んで modal を閉じる", () => {
    const targetPost = createPost({
      id: "target-1",
      timestamp: obsidianMoment("2026-04-09T16:40:00.000Z"),
    });
    const sourcePost = createPost({
      id: "source-1",
      message: "preview line 1\npreview line 2\npreview line 3",
      timestamp: obsidianMoment("2026-04-10T10:00:00.000Z"),
    });
    const onSelectPost = vi.fn();

    openBacklinkPreviewModal({} as never, {
      targetPost,
      sourcePosts: [sourcePost],
      onSelectPost,
    });

    expect(screen.getByText("参照されている投稿")).toBeDefined();
    expect(screen.getByText("参照元 1件")).toBeDefined();
    expect(screen.getAllByText(targetPost.path)).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /preview line 1/i }));

    expect(onSelectPost).toHaveBeenCalledWith(sourcePost);
    expect(document.body.querySelector(".dstr-backlink-preview-modal")).toBeNull();
  });
});
