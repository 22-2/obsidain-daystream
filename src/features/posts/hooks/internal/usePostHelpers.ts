import { Notice } from "obsidian";
import { useCallback } from "react";
import { useAppContext } from "src/core/ui/context/AppContext";
import { createRefreshPosts } from "src/features/posts/hooks/internal/refreshPosts";
import { useEditorStore } from "src/features/composer/store/editorStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { Post } from "src/core/domain/post";
import {
  findLatestPostInNote,
  findLatestThreadPostsInNote,
  replaceLatestPostMetadata,
  replaceLatestPostsMetadata,
} from "src/features/posts/services/post-metadata-service";
import { useShallow } from "zustand/shallow";

/**
 * useSubmitAction / usePostMutations の両方で使う低レベルヘルパーをまとめた内部 hook。
 * コンポーネントに公開せず、両 hook から呼び出す用途に限定する。
 */
export const usePostHelpers = () => {
  const { shell, settings } = useAppContext();

  const settingsState = useSettingsStore(
    useShallow((s) => ({
      granularity: s.granularity,
      activeTopic: s.activeTopic,
      displayMode: s.displayMode,
      date: s.date,
      searchQuery: s.searchQuery,
      threadOnly: s.threadOnly,
      viewNoteMode: s.viewNoteMode,
    })),
  );

  const editorState = useEditorStore(
    useShallow((s) => ({
      editingPost: s.editingPost,
      cancelEdit: s.cancelEdit,
    })),
  );

  const refreshPosts = useCallback(
    createRefreshPosts({
      activeTopic: settingsState.activeTopic,
      displayMode: settingsState.displayMode,
      timelineDayKey: settingsState.date.format("YYYY-MM-DD"),
      searchQuery: settingsState.searchQuery,
      threadOnly: settingsState.threadOnly,
    }),
    [
      settingsState.activeTopic,
      settingsState.displayMode,
      settingsState.date,
      settingsState.searchQuery,
      settingsState.threadOnly,
    ],
  );

  /** タイムスタンプを保存用に解決する（別日ならノート末尾に丸める） */
  const getSerializedTimestamp = useCallback(
    (timestamp: Post["timestamp"], noteDate: Post["noteDate"]) =>
      timestamp.isSame(noteDate, "day") ? timestamp : noteDate.clone().endOf("day"),
    [],
  );

  /** ファイルの連続改行（4行以上）を最大3行に正規化する */
  const normalizeFileContent = useCallback(
    async (filePath: string) => {
      const content = await shell.loadFile(filePath);
      await shell.writeFile(filePath, content.replace(/\n{4,}/g, "\n\n\n"));
    },
    [shell],
  );

  /** 投稿が現在編集中であれば編集をキャンセルする */
  const cancelEditIfActive = useCallback(
    (post: Post) => {
      if (editorState.editingPost?.id === post.id && editorState.editingPost?.path === post.path) {
        editorState.cancelEdit();
      }
    },
    [editorState],
  );

  /** 投稿が見つからなかった場合にNoticeを表示しリフレッシュする */
  const notifyNotFoundAndRefresh = useCallback(
    async (path: string, message = "投稿の位置を再特定できませんでした") => {
      new Notice(message);
      await refreshPosts(path);
    },
    [refreshPosts],
  );

  const findLatestPost = useCallback(
    (post: Post) =>
      findLatestPostInNote({
        shell,
        insertAfter: settings.insertAfter,
        noteMode: settingsState.viewNoteMode,
        post,
      }),
    [shell, settings.insertAfter, settingsState.viewNoteMode],
  );

  const findLatestThreadPosts = useCallback(
    (rootPost: Post) =>
      findLatestThreadPostsInNote({
        shell,
        insertAfter: settings.insertAfter,
        noteMode: settingsState.viewNoteMode,
        rootPost,
      }),
    [shell, settings.insertAfter, settingsState.viewNoteMode],
  );

  /**
   * 投稿のメタデータを変換して上書き保存し、画面を更新する。
   * `transformMetadata` に `(prev) => next` の形で渡す。
   */
  const replacePostAndRefresh = useCallback(
    async (
      post: Post,
      transformMetadata: (prev: Record<string, string>) => Record<string, string>,
    ) => {
      const latestPost = await replaceLatestPostMetadata({
        shell,
        insertAfter: settings.insertAfter,
        noteMode: settingsState.viewNoteMode,
        granularity: settingsState.granularity,
        post,
        transformMetadata,
      });
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
        return;
      }

      cancelEditIfActive(latestPost);
      await refreshPosts(latestPost.path);
    },
    [
      shell,
      settings.insertAfter,
      settingsState.viewNoteMode,
      settingsState.granularity,
      cancelEditIfActive,
      notifyNotFoundAndRefresh,
      refreshPosts,
    ],
  );

  /** 複数投稿を後ろから上書き保存し、画面を更新する（オフセットズレ対策） */
  const updateManyPosts = useCallback(
    async (posts: Post[], buildMetadata: (post: Post) => Record<string, string>) => {
      const sortedPosts = await replaceLatestPostsMetadata({
        shell,
        granularity: settingsState.granularity,
        posts,
        resolveLatest: findLatestPost,
        buildMetadata,
      });
      if (sortedPosts.length === 0) return;

      if (
        sortedPosts.some(
          (post) =>
            editorState.editingPost?.id === post.id && editorState.editingPost?.path === post.path,
        )
      ) {
        editorState.cancelEdit();
      }

      const firstPath = sortedPosts[0]?.path;
      if (firstPath) await refreshPosts(firstPath);
    },
    [shell, editorState, findLatestPost, refreshPosts, settingsState.granularity],
  );

  return {
    refreshPosts,
    getSerializedTimestamp,
    normalizeFileContent,
    cancelEditIfActive,
    notifyNotFoundAndRefresh,
    findLatestPost,
    findLatestThreadPosts,
    replacePostAndRefresh,
    updateManyPosts,
  };
};
