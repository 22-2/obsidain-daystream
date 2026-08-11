import { Notice } from "obsidian";
import { useCallback } from "react";
import { resolveTimestamp, toText } from "src/core/post-utils";
import { parseThinoEntries } from "src/core/thino";
import { useAppContext } from "src/ui/context/AppContext";
import { createRefreshPosts } from "src/ui/hooks/internal/refreshPosts";
import { useEditorStore } from "src/ui/store/editorStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import type { Post } from "src/ui/types";
import { buildFixedSessionPosts } from "src/ui/utils/fixed-session-utils";
import { buildPostFromEntry } from "src/ui/utils/thread-utils";
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

  const getLatestPostsForPath = useCallback(
    async (path: string, noteDate: Post["noteDate"]) => {
      const content = (await shell.loadFile(path)).replace(/\/n/g, "\n");
      if (settingsState.viewNoteMode === "fixed") {
        return buildFixedSessionPosts({
          content,
          insertAfter: settings.insertAfter,
          path,
          referenceDate: noteDate,
        });
      }

      return parseThinoEntries(content).map((entry) =>
        buildPostFromEntry({ ...entry, path, noteDate, resolveTimestamp }),
      );
    },
    [shell, settings.insertAfter, settingsState.viewNoteMode],
  );

  const findLatestPost = useCallback(
    async (post: Post): Promise<Post | null> => {
      const latestPosts = await getLatestPostsForPath(post.path, post.noteDate);

      const latestById = latestPosts.find((p) => p.id === post.id);
      if (latestById) return latestById;

      // IDで見つからない場合は、内容と日時が完全に一致する投稿を探す（位置が変わっている可能性があるため）
      return (
        latestPosts.find(
          (p) =>
            p.message.trim() === post.message.trim() &&
            p.timestamp.valueOf() === post.timestamp.valueOf(),
        ) ?? null
      );
    },
    [getLatestPostsForPath],
  );

  const findLatestThreadPosts = useCallback(
    async (rootPost: Post): Promise<Post[]> => {
      const latestPosts = await getLatestPostsForPath(rootPost.path, rootPost.noteDate);
      return latestPosts.filter((p) => p.threadRootId === rootPost.threadRootId);
    },
    [getLatestPostsForPath],
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
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
        return;
      }

      const text = toText(
        latestPost.message,
        false,
        settingsState.granularity,
        latestPost.timestamp,
        transformMetadata({ ...latestPost.metadata }),
      );

      await shell.replaceRange(latestPost.path, latestPost.startOffset, latestPost.endOffset, text);

      cancelEditIfActive(latestPost);
      await refreshPosts(latestPost.path);
    },
    [
      shell,
      settingsState.granularity,
      findLatestPost,
      cancelEditIfActive,
      notifyNotFoundAndRefresh,
      refreshPosts,
    ],
  );

  /** 複数投稿を後ろから上書き保存し、画面を更新する（オフセットズレ対策） */
  const updateManyPosts = useCallback(
    async (posts: Post[], buildMetadata: (post: Post) => Record<string, string>) => {
      const latestPosts = (await Promise.all(posts.map((post) => findLatestPost(post)))).filter(
        (post): post is Post => post !== null,
      );

      if (latestPosts.length === 0) return;

      const sortedPosts = [...latestPosts].sort((a, b) => b.startOffset - a.startOffset);

      for (const post of sortedPosts) {
        const text = toText(post.message, false, settingsState.granularity, post.noteDate, {
          ...post.metadata,
          ...buildMetadata(post),
        });
        await shell.replaceRange(post.path, post.startOffset, post.endOffset, text);
      }

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
