import { obsidianMoment } from "src/core/platform/obsidian-globals";
import { Notice, TFile } from "obsidian";
import { useCallback } from "react";
import { ensureFixedSessionHeading } from "src/core/fixed-sessions";
import { normalizeDSTRMetadata } from "src/core/metadata";
import { resolveNoteSource } from "src/core/note-source";
import { toText } from "src/core/post-utils";
import { indexNoteContent } from "src/core/db/indexer/tag-indexer";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useEditorRefs } from "src/features/composer/context/EditorRefsContext";
import { usePostHelpers } from "src/features/posts/hooks/internal/usePostHelpers";
import { usePosts } from "src/features/posts/hooks/usePosts";
import { useRequiredAppStore } from "src/features/workspace/store/appStore";
import { useEditorStore } from "src/features/composer/store/editorStore";
import { useNoteStore } from "src/features/notes/store/noteStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { mergeDraftMetadataForSubmit } from "src/features/composer/store/slices/editorSlice";
import { THREAD_METADATA_KEYS } from "src/features/posts/utils/thread-utils";
import { isTimelineView } from "src/features/workspace/utils/view-mode";
import { resolveWriteDate, resolveWriteGranularity } from "src/features/workspace/utils/write-context";
import { useShallow } from "zustand/shallow";
import { reportError } from "src/core/error-report";

/** 新規投稿・編集確定のみを担う hook。InputArea / InputAreaFooter / ReactView が利用する。 */
export const useSubmitAction = () => {
  const { shell, settings } = useAppContext();
  const store = useRequiredAppStore();

  const settingsState = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      granularity: s.granularity,
      activeTopic: s.activeTopic,
      asTask: s.asTask,
      threadFocusRootId: s.threadFocusRootId,
      viewNoteMode: s.viewNoteMode,
      displayMode: s.displayMode,
      fixedSessionNumber: s.fixedSessionNumber,
      getEffectiveDate: s.getEffectiveDate,
      setDate: s.setDate,
      setThreadFocusRootId: s.setThreadFocusRootId,
    })),
  );

  const { posts: allPosts } = usePosts();

  const editorState = useEditorStore(
    useShallow((s) => ({
      getInputValue: s.getInputValue,
      clearInput: s.clearInput,
      editingPost: s.editingPost,
      canSubmit: s.canSubmit,
      cancelEdit: s.cancelEdit,
      draftMetadata: s.draftMetadata,
      draftMetadataBase: s.draftMetadataBase,
    })),
  );

  const { scrollContainerRef } = useEditorRefs();

  const noteState = useNoteStore(useShallow((s) => ({ currentDailyNote: s.currentDailyNote })));

  const { refreshPosts, getSerializedTimestamp, notifyNotFoundAndRefresh, findLatestPost } =
    usePostHelpers();

  // 意図: Granularity は日付ビューの表示・投稿先を表す状態であり、
  // 全件を横断するタイムラインでは常に日次ノートへ投稿する。
  const writeGranularity = resolveWriteGranularity(
    settingsState.displayMode,
    settingsState.granularity,
  );

  const ensureFixedSessionInsertMarker = useCallback(
    async (note: TFile): Promise<string | null> => {
      const insertAfter = settings.insertAfter.trim();
      if (!insertAfter) {
        new Notice("Fixed session を使うには挿入位置の設定が必要です");
        return null;
      }

      const content = await shell.loadFile(note.path);
      const { nextContent, headingLine } = ensureFixedSessionHeading({
        content,
        insertAfter,
        sessionNumber: settingsState.fixedSessionNumber,
      });

      if (nextContent !== content) {
        // 意図: legacy heading を session 1 へ昇格しつつ、空 session でも実体見出しを先に作ってから投稿を挿入する。
        await shell.modifyVaultFile(note, nextContent);
      }

      return headingLine;
    },
    [shell, settings.insertAfter, settingsState.fixedSessionNumber],
  );

  const indexSavedNote = useCallback(
    async (note: TFile, content: string): Promise<void> => {
      try {
        await indexNoteContent(shell, note, settings, content);
      } catch (error) {
        // Markdown への保存自体は完了している。入力を残すと再送で重複投稿に
        // なり得るため、保存済みであることを明示して投稿処理は完了させる。
        reportError({
          context: "Failed to update DB index after saving post",
          error,
          notice: "投稿はノートに保存されましたが、一覧の更新に失敗しました。再読み込みしてください",
          details: { path: note.path },
        });
      }
    },
    [shell, settings],
  );

  // ── Sub-handlers ───────────────────────────────────────────────────────────

  /** 編集中の投稿を確定する */
  const handleEditSubmit = useCallback(
    async (currentInput: string) => {
      const editingPost = editorState.editingPost!;
      const latestPost = await findLatestPost(editingPost);
      if (!latestPost) {
        await notifyNotFoundAndRefresh(editingPost.path, "編集中の投稿を再特定できませんでした");
        return;
      }

      const now = obsidianMoment();
      let targetTs = latestPost.timestamp;
      const metadata = normalizeDSTRMetadata(
        mergeDraftMetadataForSubmit({
          latestMetadata: latestPost.metadata,
          draftMetadataBase: editorState.draftMetadataBase,
          draftMetadata: editorState.draftMetadata,
        }),
      );
      if (settings.updateDateStrategy === "always") {
        targetTs = now;
      } else if (
        settings.updateDateStrategy === "same_day" &&
        latestPost.timestamp.isSame(now, "day")
      ) {
        targetTs = now;
      }

      const text = toText(currentInput, false, writeGranularity, targetTs, metadata);

      const newContent = await shell.replaceRange(
        latestPost.path,
        latestPost.startOffset,
        latestPost.endOffset,
        text,
      );
      editorState.cancelEdit();
      // 意図: vault イベント経由の非同期インデックスを待たず、書き込んだ内容で
      // 即インデックスしてから再検証する。refreshPosts 時点で DB が古いままになり
      // 反映が1テンポ遅れるレースを防ぐ。
      const noteFile = shell.getAbstractFileByPath(latestPost.path);
      if (noteFile instanceof TFile) {
        await indexSavedNote(noteFile, newContent);
      }
      await refreshPosts(latestPost.path);
    },
    [
      shell,
      settings,
      writeGranularity,
      editorState,
      findLatestPost,
      notifyNotFoundAndRefresh,
      refreshPosts,
      indexSavedNote,
    ],
  );

  /** スレッドへの返信を投稿する */
  const handleThreadReplySubmit = useCallback(
    async (currentInput: string) => {
      const rootPost = allPosts.find((p) => p.id === settingsState.threadFocusRootId);
      if (!rootPost) {
        new Notice("スレッドの親投稿が見つかりませんでした");
        settingsState.setThreadFocusRootId(null);
        return;
      }

      const now = obsidianMoment();
      const metadata: Record<string, string> = {
        [THREAD_METADATA_KEYS.PARENT_ID]: settingsState.threadFocusRootId!,
      };
      const mergedMetadata = normalizeDSTRMetadata(
        mergeDraftMetadataForSubmit({
          latestMetadata: metadata,
          draftMetadataBase: editorState.draftMetadataBase,
          draftMetadata: editorState.draftMetadata,
        }),
      );
      // 日をまたぐ返信には `posted` を付与（同日返信は通常通りタイムスタンプ）
      if (!now.isSame(rootPost.noteDate, "day")) {
        mergedMetadata.posted = now.toISOString();
      }

      const text = toText(
        currentInput,
        false,
        writeGranularity,
        getSerializedTimestamp(now, rootPost.noteDate),
        mergedMetadata,
      );
      if (!text) {
        editorState.clearInput();
        return;
      }

      const noteFile = shell.getAbstractFileByPath(rootPost.path);
      if (!(noteFile instanceof TFile)) {
        new Notice("スレッドの投稿先ノートを解決できませんでした");
        return;
      }

      const insertMarker =
        settingsState.viewNoteMode === "fixed"
          ? await ensureFixedSessionInsertMarker(noteFile)
          : settings.insertAfter;
      if (insertMarker === null) {
        return;
      }

      const newContent = await shell.insertTextAfter(noteFile, text, insertMarker);
      // 意図: 書き込んだ内容で即インデックスし、直後の再検証で確実に返信が載るようにする。
      await indexSavedNote(noteFile, newContent);
      await refreshPosts(rootPost.path);

      editorState.clearInput();
      scrollContainerRef.current?.scrollTo({ top: 0 });
    },
    [
      shell,
      settings,
      settingsState,
      allPosts,
      editorState,
      getSerializedTimestamp,
      writeGranularity,
      refreshPosts,
      indexSavedNote,
    ],
  );

  /** 通常の新規投稿を行う */
  const handleNewPostSubmit = useCallback(
    async (currentInput: string) => {
      const now = obsidianMoment();
      const targetDate = resolveWriteDate(
        settingsState.displayMode,
        settingsState.getEffectiveDate(),
        now,
      );
      const metadata: Record<string, string> = normalizeDSTRMetadata(
        mergeDraftMetadataForSubmit({
          latestMetadata: {},
          draftMetadataBase: editorState.draftMetadataBase,
          draftMetadata: editorState.draftMetadata,
        }),
      );

      // 日をまたぐ投稿には `posted` を付与（同日投稿は通常通りタイムスタンプ）
      if (settingsState.viewNoteMode === "fixed" || !targetDate.isSame(now, "day")) {
        metadata.posted = now.toISOString();
      }

      const text = toText(
        currentInput,
        settingsState.asTask,
        writeGranularity,
        undefined,
        metadata,
      );

      // テキストが空なら投稿しない（空タスクも不可）
      if (!text) {
        new Notice("空の投稿はできません");
        return;
      }

      // 投稿先ノートを解決する。固定ノートモードなら常に同じノート、そうでなければ基準日に応じたノート。
      const noteSource = resolveNoteSource({
        shell,
        date: targetDate,
        granularity: writeGranularity,
        activeTopic: settingsState.activeTopic,
        noteMode: settingsState.viewNoteMode,
        file: store.getState().file,
      });

      let note = noteState.currentDailyNote;

      // 固定ノートモードでない場合は、基準日に応じたノートを解決する
      if (noteSource.mode !== "fixed") {
        note = noteSource.resolveCurrentNote();
      }

      if (!note) {
        // 存在しない場合はノートを作成してから再度解決する（特にタイムラインモード）
        // 意図: マーカーは後段の insertTextAfterEnsuringMarker が同一 write 内で
        // 保証するため、ここでの追記 write を省いて vault イベントの多重発火を防ぐ。
        note = await store
          .getState()
          .createNoteWithInsertAfter(
            shell,
            settings,
            noteSource.mode === "fixed" ? undefined : targetDate,
            { ensureInsertAfter: false },
          );
      }

      if (!note) {
        new Notice("投稿先ノートを解決できませんでした");
        return;
      }

      let newContent: string;
      if (noteSource.mode === "fixed") {
        const fixedInsertMarker = await ensureFixedSessionInsertMarker(note);
        if (fixedInsertMarker === null) {
          return;
        }
        newContent = await shell.insertTextAfter(note, text, fixedInsertMarker);
      } else {
        // 意図: 「マーカー追記」と「本文挿入」を 1 read + 1 write に畳む。
        // 別々に書くと modify イベントが多重発火し、インデックスと SWR 再検証が
        // 連鎖してタイムラインがガクつく。
        newContent = await shell.insertTextAfterEnsuringMarker(note, text, settings.insertAfter);
      }

      // 意図: vault イベント経由の非同期インデックス完了を待たず、
      // 書き込んだ内容で即インデックスする。これで直後の refreshPosts の
      // 再検証時点で必ず新しい投稿が DB から読め、「反映が遅れる」レースが消える。
      await indexSavedNote(note, newContent);

      if (
        isTimelineView(settingsState.displayMode) &&
        !settingsState.date.isSame(targetDate, "day")
      ) {
        // 意図: 日付跨ぎ直後は submit 冒頭の setDate だけだと、
        // 非同期処理をまたぐ間にタイムライン基準日が旧日のまま再検証されることがある。
        // 実際に投稿先ノートが確定した時点で再度同期し、refreshPosts の対象日を固定する。
        settingsState.setDate(targetDate.clone());
      }

      editorState.clearInput();
      shell.trigger("dstr:scroll-to-top");

      await refreshPosts(note.path);

      // フォーカスモードでは、投稿後に基準日を「いま」に同期する。
      if (settingsState.viewNoteMode === "periodic" && settingsState.displayMode === "focus") {
        settingsState.setDate(obsidianMoment());
      }
    },
    [
      shell,
      settings,
      settingsState,
      editorState,
      noteState,
      store,
      writeGranularity,
      refreshPosts,
      ensureFixedSessionInsertMarker,
      indexSavedNote,
    ],
  );

  // ── Public action ──────────────────────────────────────────────────────────

  /** 新規投稿 / 編集の確定 */
  const handleSubmit = useCallback(async () => {
    if (!editorState.canSubmit(allPosts)) return;

    // タイムライン表示中は submit のたびに基準日を「いま」に同期する。
    // 意図: 日付跨ぎ直後は stale な日付のまま再検証されると、
    // DBに投稿があってもタイムライン範囲外となり UI が空表示になる。
    if (isTimelineView(settingsState.displayMode)) {
      settingsState.setDate(obsidianMoment());
    }

    const currentInput = editorState.getInputValue();

    if (editorState.editingPost) return handleEditSubmit(currentInput);
    if (settingsState.threadFocusRootId) return handleThreadReplySubmit(currentInput);
    return handleNewPostSubmit(currentInput);
  }, [
    allPosts,
    editorState,
    settingsState,
    handleEditSubmit,
    handleThreadReplySubmit,
    handleNewPostSubmit,
  ]);

  return { handleSubmit };
};
