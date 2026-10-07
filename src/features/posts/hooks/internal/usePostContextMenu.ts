import { Menu, Notice } from "obsidian";
import { useCallback } from "react";
import { DISPLAY_MODE } from "src/features/workspace/config/constants";
import type { DisplayMode, MomentLike, Post } from "src/features/workspace/types";
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
  archivePost: (post: Post) => void;
  createThread: (post: Post) => void;
  deletePost: (post: Post) => void;
  permanentlyDeletePost: (post: Post) => void;
  movePostToTomorrow: (post: Post) => void;
  handleHighlightPost: (post: Post) => void;
  handleHighlightSource: (post: Post) => void;
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
  setPostPinned: (post: Post, pinned: boolean) => void;
  copyBlockIdLink: (post: Post) => void;
};

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
              setPostPinned(post, !isPinned(post.metadata));
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle(isThreadRoot(post) ? "スレッドを表示" : "スレッドを作成")
            .setIcon("spool")
            .setDisabled(isReadOnly || isThreadReply(post))
            .onClick(() => {
              createThread(post);
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
              movePostToTomorrow(post);
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("タグ付け")
            .setIcon("tag")
            .setDisabled(isReadOnly || !capabilities.supportsTags)
            .onClick(async () => {
              const nextValue = await showTextInput({
                title: "タグを入力",
                placeholder: "IT, Later",
                defaultValue: getRawTagMetadata(post.metadata),
              });

              if (nextValue === null) {
                return;
              }

              await setPostTags(post, nextValue);
            }),
        );

        sub.addItem((si) =>
          si
            .setTitle("ブロックIDを付与してコピー")
            .setIcon("link")
            .setDisabled(isReadOnly)
            .onClick(() => {
              copyBlockIdLink(post);
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
              handleHighlightPost(post);
            }),
        );
      }

      menu.addItem((item) =>
        item
          .setTitle("投稿のソースにジャンプ")
          .setIcon("code-xml")
          .onClick(() => {
            handleHighlightSource(post);
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
          .onClick(async () => {
            await navigator.clipboard.writeText(post.message);
            new Notice("copied");
          }),
      );

      menu.addSeparator();

      menu.addItem((item) =>
        item
          .setTitle("アーカイブ")
          .setIcon("archive")
          .setDisabled(isReadOnly)
          .onClick(() => {
            archivePost(post);
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("削除")
          .setIcon("trash")
          .setWarning(true)
          .setDisabled(isReadOnly)
          .onClick(() => {
            deletePost(post);
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("永久に削除")
          .setIcon("trash")
          .setWarning(true)
          .setDisabled(isReadOnly)
          .onClick(() => {
            // 意図: confirmDeleteAction は () => Promise<void> を要求するが、
            // permanentlyDeletePost が同期の可能性があるため async でラップする。
            confirmDeleteAction(async () => {
              permanentlyDeletePost(post);
            });
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
