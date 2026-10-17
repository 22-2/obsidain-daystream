import { Menu, Notice } from "obsidian";
import type React from "react";
import { useCallback } from "react";
import { reportError } from "src/core/error-report";
import { DISPLAY_MODE } from "src/features/workspace/config/constants";
import type { MomentLike, Post } from "src/core/domain/post";
import type { DisplayMode } from "src/features/workspace/types";
import { getRawTagMetadata, isPinned } from "src/core/domain/post-metadata";
import { isThreadReply, isThreadRoot } from "src/features/posts/utils/thread-utils";

type PostContextMenuCapabilities = {
  supportsDateNavigation: boolean;
  supportsMovePostBetweenDays: boolean;
  supportsTags: boolean;
};

type UsePostContextMenuInput = {
  isReadOnly: boolean;
  capabilities: PostContextMenuCapabilities;
  archivePost: (post: Post) => Promise<void>;
  createThread: (post: Post) => Promise<void>;
  deletePost: (post: Post) => Promise<void>;
  permanentlyDeletePost: (post: Post) => Promise<void>;
  movePostToTomorrow: (post: Post) => Promise<void>;
  handleHighlightPost: (post: Post) => Promise<void>;
  handleHighlightSource: (post: Post) => Promise<void>;
  setDate: (date: MomentLike) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  startEdit: (post: Post) => void;
  openEditorInNewWindow: (post: Post) => void;
  showTextInput: (args: {
    title: string;
    placeholder?: string;
    defaultValue?: string;
  }) => Promise<string | null>;
  confirmDeleteAction: (onConfirm: () => Promise<void>) => void;
  setPostTags: (post: Post, tags: string) => Promise<void>;
  setPostPinned: (post: Post, pinned: boolean) => Promise<void>;
  copyBlockIdLink: (post: Post) => Promise<void>;
};

function runContextMenuAction(context: string, action: () => Promise<void>): void {
  void action().catch((error: unknown) => reportError({ context, error }));
}

export function usePostContextMenu({
  isReadOnly,
  capabilities,
  archivePost,
  createThread,
  deletePost,
  permanentlyDeletePost,
  movePostToTomorrow,
  handleHighlightPost,
  handleHighlightSource,
  setDate,
  setDisplayMode,
  startEdit,
  openEditorInNewWindow,
  showTextInput,
  confirmDeleteAction,
  setPostTags,
  setPostPinned,
  copyBlockIdLink,
}: UsePostContextMenuInput) {
  const showPostContextMenu = useCallback(
    (post: Post, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const menu = new Menu();

      menu.addItem((item) => {
        item.setTitle("実験的").setIcon("beaker");
        const sub = item.setSubmenu();

        sub.addItem((si) =>
          si
            .setTitle(isPinned(post.metadata) ? "ピン留め解除" : "ピン留め")
            .setIcon("pin")
            .setDisabled(isReadOnly)
            .onClick(() => {
              runContextMenuAction("Failed to update post pin state", () =>
                setPostPinned(post, !isPinned(post.metadata)),
              );
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle(isThreadRoot(post) ? "スレッドを表示" : "スレッドを作成")
            .setIcon("spool")
            .setDisabled(isReadOnly || isThreadReply(post))
            .onClick(() => {
              runContextMenuAction("Failed to create post thread", () => createThread(post));
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("この日にフォーカス")
            .setIcon("calendar-range")
            .setDisabled(!capabilities.supportsDateNavigation)
            .onClick(() => {
              setDate(post.timestamp.clone());
              setDisplayMode(DISPLAY_MODE.FOCUS);
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("明日に送る")
            .setIcon("fast-forward")
            .setDisabled(isReadOnly || !capabilities.supportsMovePostBetweenDays)
            .onClick(() => {
              runContextMenuAction("Failed to move post to tomorrow", () =>
                movePostToTomorrow(post),
              );
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("タグ付け")
            .setIcon("tag")
            .setDisabled(isReadOnly || !capabilities.supportsTags)
            .onClick(() => {
              runContextMenuAction("Failed to update post tags", async () => {
                const nextValue = await showTextInput({
                  title: "タグを入力",
                  placeholder: "IT, Later",
                  defaultValue: getRawTagMetadata(post.metadata),
                });

                if (nextValue === null) {
                  return;
                }

                await setPostTags(post, nextValue);
              });
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("ブロックIDを付与してコピー")
            .setIcon("link")
            .setDisabled(isReadOnly)
            .onClick(() => {
              runContextMenuAction("Failed to copy post block link", () => copyBlockIdLink(post));
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("新しいウィンドウで編集")
            .setIcon("picture-in-picture-2")
            .setDisabled(isReadOnly)
            .onClick(() => {
              openEditorInNewWindow(post);
            }),
        );
      });

      menu.addSeparator();

      if (capabilities.supportsDateNavigation) {
        menu.addItem((item) =>
          item
            .setTitle("投稿にジャンプ")
            .setIcon("clock")
            .onClick(() => {
              runContextMenuAction("Failed to jump to post", () => handleHighlightPost(post));
            }),
        );
      }

      menu.addItem((item) =>
        item
          .setTitle("投稿のソースにジャンプ")
          .setIcon("code-xml")
          .onClick(() => {
            runContextMenuAction("Failed to open post source", () => handleHighlightSource(post));
          }),
      );

      menu.addSeparator();

      menu.addItem((item) =>
        item
          .setTitle("編集")
          .setIcon("pencil")
          .setDisabled(isReadOnly)
          .onClick(() => {
            startEdit(post);
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("コピー")
          .setIcon("copy")
          .onClick(() => {
            runContextMenuAction("Failed to copy post text", async () => {
              await navigator.clipboard.writeText(post.message);
              new Notice("Copied");
            });
          }),
      );

      menu.addSeparator();

      menu.addItem((item) =>
        item
          .setTitle("アーカイブ")
          .setIcon("archive")
          .setDisabled(isReadOnly)
          .onClick(() => {
            runContextMenuAction("Failed to archive post", () => archivePost(post));
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("削除")
          .setIcon("trash")
          .setWarning(true)
          .setDisabled(isReadOnly)
          .onClick(() => {
            runContextMenuAction("Failed to delete post", () => deletePost(post));
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("永久に削除")
          .setIcon("trash")
          .setWarning(true)
          .setDisabled(isReadOnly)
          .onClick(() => {
            confirmDeleteAction(() => permanentlyDeletePost(post));
          }),
      );

      menu.showAtMouseEvent(e.nativeEvent);
    },
    [
      archivePost,
      createThread,
      deletePost,
      permanentlyDeletePost,
      handleHighlightPost,
      handleHighlightSource,
      isReadOnly,
      movePostToTomorrow,
      setPostTags,
      setPostPinned,
      setDate,
      setDisplayMode,
      startEdit,
      openEditorInNewWindow,
      capabilities.supportsDateNavigation,
      capabilities.supportsMovePostBetweenDays,
      capabilities.supportsTags,
      showTextInput,
      confirmDeleteAction,
      copyBlockIdLink,
    ],
  );

  return { showPostContextMenu };
}
