import { Notice, TFile } from "obsidian";
import { useCallback } from "react";
import { normalizeDSTRMetadata } from "src/core/metadata";
import { obsidianMoment } from "src/core/platform/obsidian-globals";
import { toText } from "src/core/post-utils";
import { serializeDSTRTags, TAG_METADATA_KEY } from "src/core/tags";
import { DISPLAY_MODE } from "src/features/workspace/config/constants";
import { useAppContext } from "src/core/ui/context/AppContext";
import { usePostHelpers } from "src/features/posts/hooks/internal/usePostHelpers";
import { useRequiredAppStore } from "src/features/workspace/store/appStore";
import { useEditorStore } from "src/features/composer/store/editorStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import type { Post } from "src/core/domain/post";
import { openMarkdownNote } from "src/features/notes/utils/open-markdown-note";
import { PINNED_METADATA_KEY } from "src/core/domain/post-metadata";
import { resolvePostGranularity } from "src/features/posts/services/post-metadata-service";
import { createThreadId, isThreadRoot, THREAD_METADATA_KEYS } from "src/features/posts/utils/thread-utils";
import { useShallow } from "zustand/shallow";

/** 投稿の CRUD・タグ・ピン等、一覧上の操作を担う hook。PostListView が利用する。 */
export const usePostMutations = () => {
  const { shell, settings } = useAppContext();
  const store = useRequiredAppStore();

  const settingsState = useSettingsStore(
    useShallow((s) => ({
      isReadOnly: s.isReadOnly(),
      viewNoteMode: s.viewNoteMode,
      threadFocusRootId: s.threadFocusRootId,
      setThreadFocusRootId: s.setThreadFocusRootId,
      setAsTask: s.setAsTask,
      setThreadOnly: s.setThreadOnly,
      setActiveTag: s.setActiveTag,
      setSearchQuery: s.setSearchQuery,
      setTimeFilter: s.setTimeFilter,
      setGranularity: s.setGranularity,
      setDateFilter: s.setDateFilter,
      setDate: s.setDate,
      setDisplayMode: s.setDisplayMode,
    })),
  );

  const editorState = useEditorStore(
    useShallow((s) => ({
      editingPost: s.editingPost,
      cancelEdit: s.cancelEdit,
      setHighlightedPost: s.setHighlightedPost,
    })),
  );

  const {
    writeGranularity,
    refreshPosts,
    getSerializedTimestamp,
    normalizeFileContent,
    cancelEditIfActive,
    notifyNotFoundAndRefresh,
    findLatestPost,
    findLatestThreadPosts,
    replacePostAndRefresh,
    updateManyPosts,
  } = usePostHelpers();

  // ── Public actions ─────────────────────────────────────────────────────────

  /** 投稿を削除（削除フラグを付与して上書き） */
  const deletePost = useCallback(
    async (post: Post) => {
      const now = obsidianMoment();

      if (isThreadRoot(post)) {
        const latestThreadPosts = await findLatestThreadPosts(post);
        if (latestThreadPosts.length === 0) {
          await notifyNotFoundAndRefresh(post.path, "スレッドの投稿を再特定できませんでした");
          return;
        }

        await updateManyPosts(latestThreadPosts, () => ({
          deleted: now.format("YYYYMMDDHHmmss"),
        }));

        if (settingsState.threadFocusRootId === post.threadRootId) {
          settingsState.setThreadFocusRootId(null);
        }
        return;
      }

      await replacePostAndRefresh(post, (prev) => ({
        ...prev,
        deleted: now.format("YYYYMMDDHHmmss"),
      }));
    },
    [
      replacePostAndRefresh,
      settingsState,
      findLatestThreadPosts,
      notifyNotFoundAndRefresh,
      updateManyPosts,
    ],
  );

  /** 投稿を恒久削除（ファイル中の該当エントリを完全に取り除く） */
  const permanentlyDeletePost = useCallback(
    async (post: Post) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
        return;
      }

      if (isThreadRoot(latestPost)) {
        const latestThreadPosts = await findLatestThreadPosts(latestPost);
        if (latestThreadPosts.length === 0) {
          await notifyNotFoundAndRefresh(post.path, "スレッドの投稿を再特定できませんでした");
          return;
        }

        // オフセットズレ対策のため後ろから削除
        const sorted = latestThreadPosts.slice().sort((a, b) => b.startOffset - a.startOffset);

        for (const p of sorted) {
          await shell.replaceRange(p.path, p.startOffset, p.endOffset, "");
        }

        const filePath = sorted[0]?.path;
        if (filePath) {
          await normalizeFileContent(filePath);
          await refreshPosts(filePath);
        }

        if (settingsState.threadFocusRootId === latestPost.threadRootId) {
          settingsState.setThreadFocusRootId(null);
        }
        return;
      }

      // 単一投稿の削除
      await shell.replaceRange(latestPost.path, latestPost.startOffset, latestPost.endOffset, "");
      await normalizeFileContent(latestPost.path);
      await refreshPosts(latestPost.path);
    },
    [
      shell,
      findLatestPost,
      findLatestThreadPosts,
      normalizeFileContent,
      notifyNotFoundAndRefresh,
      refreshPosts,
      settingsState,
    ],
  );

  /** 投稿をアーカイブ（アーカイブフラグを付与して上書き） */
  const archivePost = useCallback(
    async (post: Post) => {
      const now = obsidianMoment();
      await replacePostAndRefresh(post, (prev) => ({
        ...prev,
        archived: now.format("YYYYMMDDHHmmss"),
      }));
    },
    [replacePostAndRefresh],
  );

  /** 投稿のタグを更新する */
  const setPostTags = useCallback(
    async (post: Post, rawInput: string) => {
      await replacePostAndRefresh(post, (metadata) => {
        const serializedTags = serializeDSTRTags(rawInput.split(","));
        if (serializedTags.length === 0) {
          const { [TAG_METADATA_KEY]: _removed, ...rest } = metadata;
          return rest;
        }
        return { ...metadata, [TAG_METADATA_KEY]: serializedTags };
      });
    },
    [replacePostAndRefresh],
  );

  /** 投稿のピン留め状態を更新する */
  const setPostPinned = useCallback(
    async (post: Post, pinned: boolean) => {
      await replacePostAndRefresh(post, (metadata) => {
        if (!pinned) {
          // 意図: 空文字を残すと「キーがあるので pinned 扱い」と再解釈されうるため、
          // 解除時はキーごと削除して保存形式を正規化する。
          const { [PINNED_METADATA_KEY]: _removed, ...rest } = metadata;
          return rest;
        }
        return { ...metadata, [PINNED_METADATA_KEY]: "1" };
      });
    },
    [replacePostAndRefresh],
  );

  /** 投稿を翌日へ移動 */
  const movePostToTomorrow = useCallback(
    async (post: Post) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
        return;
      }

      if (latestPost.threadRootId) {
        new Notice("スレッド投稿は明日に送れません");
        return;
      }
      if (settingsState.isReadOnly) {
        new Notice("過去のノートの投稿は移動できません");
        return;
      }
      if (settingsState.viewNoteMode === "fixed") {
        new Notice("固定ノートモードでは利用できません");
        return;
      }

      const nextDay = latestPost.timestamp.clone().add(1, "day");
      const nextNote = await store.getState().createNoteWithInsertAfter(shell, settings, nextDay);
      if (!nextNote) {
        new Notice("明日のノートが見つかりませんでした");
        return;
      }

      const now = obsidianMoment();
      const metadata = { ...latestPost.metadata };
      if (!nextDay.isSame(now, "day")) metadata.posted = now.toISOString();

      const messageWithFrom = `${latestPost.message} (from ${latestPost.timestamp.format("YYYY-MM-DD")})`;
      const text = toText(messageWithFrom, false, writeGranularity, nextDay, metadata);

      await shell.insertTextAfter(nextNote, text, settings.insertAfter);
      await deletePost(latestPost);

      new Notice("明日に送りました");
    },
    [
      shell,
      settings,
      settingsState,
      writeGranularity,
      findLatestPost,
      notifyNotFoundAndRefresh,
      deletePost,
      store,
    ],
  );

  /** ブロックIDリンクをクリップボードにコピーする */
  const copyBlockIdLink = useCallback(
    async (post: Post) => {
      let blockId = post.metadata.blockId;
      if (!blockId) {
        blockId = Math.random().toString(36).substring(2, 8);
        await replacePostAndRefresh(post, (prev) => ({ ...prev, blockId }));
      }

      const file = shell.getVault().getAbstractFileByPath(post.path);
      if (!(file instanceof TFile)) {
        new Notice("ファイルを特定できませんでした");
        return;
      }

      const link = shell.getRawApp().fileManager.generateMarkdownLink(file, "", `#^${blockId}`);
      await navigator.clipboard.writeText(link);
      new Notice("ブロックIDリンクをコピーしました");
    },
    [shell, replacePostAndRefresh],
  );

  /** スレッドを作成する、または既存スレッドにフォーカスする */
  const createThread = useCallback(
    async (post: Post) => {
      // 既存スレッドのルート投稿をクリックした場合はフォーカスのみ
      if (post.threadRootId === post.id) {
        settingsState.setThreadFocusRootId(post.id, post.noteDate);
        return;
      }
      // 返信からはスレッド作成不可
      if (post.threadRootId && post.threadRootId !== post.id) {
        new Notice("返信からはスレッドを作成できません");
        return;
      }

      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
        return;
      }

      const rootId = createThreadId();
      const text = toText(
        latestPost.message,
        false,
        resolvePostGranularity(latestPost, writeGranularity),
        getSerializedTimestamp(latestPost.timestamp, latestPost.noteDate),
        normalizeDSTRMetadata({
          ...latestPost.metadata,
          [THREAD_METADATA_KEYS.ID]: rootId,
        }),
      );

      await shell.replaceRange(latestPost.path, latestPost.startOffset, latestPost.endOffset, text);

      cancelEditIfActive(latestPost);
      settingsState.setThreadFocusRootId(rootId, latestPost.noteDate);
      await refreshPosts(latestPost.path);
      new Notice("スレッドを作成しました");
    },
    [
      shell,
      settingsState,
      writeGranularity,
      findLatestPost,
      getSerializedTimestamp,
      cancelEditIfActive,
      notifyNotFoundAndRefresh,
      refreshPosts,
    ],
  );

  const handleHighlightSource = useCallback(
    async (post: Post) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
        return;
      }

      const noteFile = shell.getAbstractFileByPath(latestPost.path);
      if (!(noteFile instanceof TFile)) return;

      const leaf = shell.getLeaf(true);
      await shell.revealLeaf(leaf);
      await openMarkdownNote(leaf, noteFile.path);

      const markdownView = shell.getActiveMarkdownView();
      if (!markdownView) return;

      const editor = markdownView.editor;
      const startPos = editor.offsetToPos(latestPost.bodyStartOffset);
      const endPos = editor.offsetToPos(
        latestPost.bodyStartOffset + latestPost.message.length,
      );
      queueMicrotask(() => {
        markdownView.editMode.highlightSearchMatches([
          {
            from: { line: startPos.line, ch: startPos.ch },
            to: { line: endPos.line, ch: endPos.ch },
          },
        ]);
      });
    },
    [shell, findLatestPost, notifyNotFoundAndRefresh],
  );

  /** 投稿を同じ Daystream タブの focused モードで開き、一覧上でハイライトする */
  const handleHighlightPost = useCallback(
    async (post: Post) => {
      const latestPost = await findLatestPost(post);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(post.path);
        return;
      }

      // 意図: exact jump は Daystream 内の文脈を保ったまま対象日へ移動したいので、
      // 外部 leaf ではなく focused/day/all の状態へ寄せて一覧上の強調表示へ統一する。
      if (
        editorState.editingPost &&
        (editorState.editingPost.id !== latestPost.id ||
          editorState.editingPost.path !== latestPost.path)
      ) {
        editorState.cancelEdit();
      }

      settingsState.setAsTask(false);
      settingsState.setThreadOnly(false);
      settingsState.setActiveTag(null);
      settingsState.setSearchQuery("");
      settingsState.setTimeFilter("all");
      settingsState.setGranularity("day");
      settingsState.setDateFilter("today");
      settingsState.setDate(latestPost.noteDate.clone());
      settingsState.setDisplayMode(DISPLAY_MODE.FOCUS);
      editorState.setHighlightedPost(latestPost);
    },
    [editorState, findLatestPost, notifyNotFoundAndRefresh, settingsState],
  );

  return {
    deletePost,
    permanentlyDeletePost,
    archivePost,
    setPostTags,
    setPostPinned,
    movePostToTomorrow,
    copyBlockIdLink,
    createThread,
    handleHighlightSource,
    handleHighlightPost,
  };
};
