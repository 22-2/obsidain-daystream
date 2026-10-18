import { Notice, TFile } from "obsidian";
import { useCallback } from "react";
import { indexNoteContent } from "src/core/db/indexer/tag-indexer";
import { reportError } from "src/core/error-report";
import { normalizeDSTRMetadata } from "src/core/metadata";
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
import { resolveWriteGranularity } from "src/features/workspace/utils/write-context";
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

  // 意図: 投稿元ノートの粒度が分からない投稿は、新規投稿と同じ規則で書き込み先の粒度を決める。
  const writeGranularity = resolveWriteGranularity(
    settingsState.displayMode,
    settingsState.granularity,
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

  /** 書き込んだ全文でノートをDBへ反映する。失敗しても保存済みの書き込みは取り消さない。 */
  const indexSavedNote = useCallback(
    async (note: TFile, content: string): Promise<void> => {
      try {
        await indexNoteContent(shell, note, settings, content);
      } catch (error) {
        // Markdown への保存自体は完了している。入力を残すと再送で重複投稿に
        // なり得るため、保存済みであることを明示して処理は完了させる。
        reportError({
          context: "Failed to update DB index after saving post",
          error,
          notice: "ノートには保存されましたが、一覧の更新に失敗しました。再読み込みしてください",
          details: { path: note.path },
        });
      }
    },
    [shell, settings],
  );

  /**
   * 書き込み後の共通処理。書いた全文で即インデックスしてから一覧を再検証する。
   * 意図: vault イベント経由の非同期インデックスを待つと、再検証の時点で DB が古いままになり
   * 反映が1テンポ遅れるため、すべての書き込み経路でこの順序を守る。
   */
  const syncWrittenNote = useCallback(
    async (path: string, content: string): Promise<void> => {
      const note = shell.getAbstractFileByPath(path);
      if (note instanceof TFile) {
        await indexSavedNote(note, content);
      }
      await refreshPosts(path);
    },
    [shell, indexSavedNote, refreshPosts],
  );

  /** タイムスタンプを保存用に解決する（別日ならノート末尾に丸める） */
  const getSerializedTimestamp = useCallback(
    (timestamp: Post["timestamp"], noteDate: Post["noteDate"]) =>
      timestamp.isSame(noteDate, "day") ? timestamp : noteDate.clone().endOf("day"),
    [],
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
      const written = await replaceLatestPostMetadata({
        shell,
        insertAfter: settings.insertAfter,
        noteMode: settingsState.viewNoteMode,
        granularity: writeGranularity,
        post,
        transformMetadata: (metadata) => normalizeDSTRMetadata(transformMetadata(metadata)),
      });
      if (!written) {
        await notifyNotFoundAndRefresh(post.path);
        return;
      }

      cancelEditIfActive(written.posts);
      await syncWrittenNote(written.posts.path, written.content);
    },
    [
      shell,
      settings.insertAfter,
      settingsState.viewNoteMode,
      writeGranularity,
      cancelEditIfActive,
      notifyNotFoundAndRefresh,
      syncWrittenNote,
    ],
  );

  /** 複数投稿を後ろから上書き保存し、画面を更新する（オフセットズレ対策） */
  const updateManyPosts = useCallback(
    async (posts: Post[], buildMetadata: (post: Post) => Record<string, string>) => {
      const written = await replaceLatestPostsMetadata({
        shell,
        granularity: writeGranularity,
        posts,
        resolveLatest: findLatestPost,
        buildMetadata: (post) => normalizeDSTRMetadata(buildMetadata(post)),
      });
      if (!written) return;

      if (
        written.posts.some(
          (post) =>
            editorState.editingPost?.id === post.id && editorState.editingPost?.path === post.path,
        )
      ) {
        editorState.cancelEdit();
      }

      await syncWrittenNote(written.posts[0].path, written.content);
    },
    [shell, editorState, findLatestPost, syncWrittenNote, writeGranularity],
  );

  return {
    writeGranularity,
    refreshPosts,
    indexSavedNote,
    syncWrittenNote,
    getSerializedTimestamp,
    cancelEditIfActive,
    notifyNotFoundAndRefresh,
    findLatestPost,
    findLatestThreadPosts,
    replacePostAndRefresh,
    updateManyPosts,
  };
};
