// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import moment from "moment";
import React from "react";
import { PostCardView } from "src/features/posts/components/posts/PostCardView";
import type { Post } from "src/core/domain/post";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  setTooltip: (el: HTMLElement, tooltip: string) =>
    el.setAttribute("aria-label", tooltip),
}));

vi.mock("src/features/workspace/store/appStore", () => ({
  useAppStore: <T,>(
    selector: (state: {
      pluginSettings: {
        allowEditingPastNotes: boolean;
        enabledCardView: boolean;
      };
    }) => T,
  ): T =>
    selector({
      pluginSettings: {
        allowEditingPastNotes: true,
        enabledCardView: false,
      },
    }),
}));

vi.mock("src/features/workspace/store/settingsStore", () => ({
  useSettingsStore: <T,>(selector: (state: { viewNoteMode: "periodic" }) => T): T =>
    selector({ viewNoteMode: "periodic" }),
}));

vi.mock("src/core/ui/components/common/ObsidianMarkdown", () => ({
  ObsidianMarkdown: ({ content }: { content: string }) => React.createElement("div", null, content),
}));

vi.mock("src/core/ui/components/common/ObsidianIcon", () => ({
  ObsidianIcon: ({
    name,
    children,
    ...restProps
  }: {
    name: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("div", { "data-icon-name": name, ...restProps }, children),
}));

function createPost(overrides: Partial<Post>): Post {
  const timestamp = overrides.timestamp ?? moment("2026-04-10T16:00:00.000Z");

  return {
    id: overrides.id ?? "post-1",
    threadRootId: overrides.threadRootId ?? null,
    timestamp,
    noteDate: overrides.noteDate ?? moment("2026-04-10T00:00:00.000Z"),
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

describe("PostCardView", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("backlink 数と thread icon を footerRightAddon に併記する", () => {
    const post = createPost({
      id: "root-1",
      threadRootId: "root-1",
      metadata: { blockId: "a054d5" },
    });
    const onOpenBacklinks = vi.fn();

    render(
      <PostCardView
        post={post}
        backlinkCount={2}
        granularity="day"
        onOpenBacklinks={onOpenBacklinks}
        onToggleThreadFocus={() => {}}
      />,
    );

    fireEvent.click(screen.getByLabelText("被リンク 2件をプレビュー"));

    expect(onOpenBacklinks).toHaveBeenCalledWith(post);
    expect(screen.getByLabelText("被リンク 2件をプレビュー")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByLabelText("スレッドを表示")).toBeDefined();
  });

  it("backlink が 0 件なら indicator を出さない", () => {
    const post = createPost({ id: "post-1", threadRootId: null });

    render(<PostCardView post={post} backlinkCount={0} granularity="day" />);

    expect(screen.queryByLabelText(/被リンク/)).toBeNull();
  });

  it("highlight 指定時はカードに強調クラスを付ける", () => {
    const post = createPost({ id: "post-highlight", threadRootId: null });

    const { container } = render(
      <PostCardView post={post} backlinkCount={0} granularity="day" isHighlighted />,
    );

    expect(container.querySelector(".dstr-card--highlighted")).not.toBeNull();
  });
});
