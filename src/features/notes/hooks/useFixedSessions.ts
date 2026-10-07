import { Notice, TFile } from "obsidian";
import { useCallback, useEffect, useMemo } from "react";
import { normalizeFixedNotePath } from "src/core/fixed-note";
import { ensureFixedSessionHeading, removeFixedSessionSection } from "src/core/fixed-sessions";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useObsidianUi } from "src/features/workspace/hooks/useObsidianUi";
import { useAppStore } from "src/features/workspace/store/appStore";
import { useEditorStore } from "src/features/composer/store/editorStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { getDraftMetadataStorageKey, getInputStorageKey } from "src/features/composer/store/slices/inputStorage";
import {
  readFixedSessionMeta,
  removeFixedSessionMeta,
  updateFixedSessionMeta,
  writeLastOpenedFixedSessionNumber,
} from "src/features/notes/utils/fixed-session-storage";
import {
  buildFixedSessionSummaries,
  groupSessionsByActivity,
  type FixedSessionSummary,
} from "src/features/notes/utils/fixed-session-utils";
import useSWR from "swr";
import { useShallow } from "zustand/shallow";

interface FixedSessionFetchResult {
  noteExists: boolean;
  sessionCount: number;
  sessions: FixedSessionSummary[];
}

// 意図: ノートと下書きの更新順序を一か所で管理し、サイドバーは表示とメニュー構築に専念する。
export const useFixedSessions = () => {
  const { shell, settings } = useAppContext();
  const { confirmDelete, showTextInput } = useObsidianUi();
  const { file, storage, createNoteWithInsertAfter } = useAppStore(
    useShallow((state) => ({
      file: state.file,
      storage: state.storage,
      createNoteWithInsertAfter: state.createNoteWithInsertAfter,
    })),
  );
  const { fixedSessionNumber, setFixedSessionNumber } = useSettingsStore(
    useShallow((state) => ({
      fixedSessionNumber: state.fixedSessionNumber,
      setFixedSessionNumber: state.setFixedSessionNumber,
    })),
  );
  const { editingPost } = useEditorStore(
    useShallow((state) => ({ editingPost: state.editingPost })),
  );

  const normalizedFixedPath = useMemo(() => normalizeFixedNotePath(file ?? ""), [file]);

  const {
    data: fixedSessionFetch,
    mutate,
    isLoading,
  } = useSWR<FixedSessionFetchResult>(
    normalizedFixedPath
      ? ["posts", "fixed-sessions", normalizedFixedPath, settings.insertAfter]
      : null,
    async () => {
      const note = shell.getAbstractFileByPath(normalizedFixedPath);
      if (!(note instanceof TFile)) {
        return {
          noteExists: false,
          sessionCount: 0,
          sessions: [],
        };
      }

      let content = "";
      try {
        content = await shell.loadFile(note.path);
      } catch {
        return {
          noteExists: false,
          sessionCount: 0,
          sessions: [],
        };
      }
      const sessions = buildFixedSessionSummaries({
        content,
        insertAfter: settings.insertAfter,
        metaMap: await readFixedSessionMeta(shell, storage, note.path),
      });

      return {
        noteExists: true,
        sessionCount: sessions.length,
        sessions,
      };
    },
  );

  const sessions = fixedSessionFetch?.sessions ?? [];
  const shouldShowLoading =
    normalizedFixedPath.length === 0 || isLoading || fixedSessionFetch == null;

  const groupedSessions = useMemo(() => groupSessionsByActivity(sessions), [sessions]);

  useEffect(() => {
    if (!fixedSessionFetch?.noteExists) {
      return;
    }

    // 意図: fixed ノートを reopen したときは新しい leaf に前回の viewState が無いことがある。
    // session 選択をノート単位で退避しておくと、再オープンでも最後の位置から再開できる。
    writeLastOpenedFixedSessionNumber(storage, normalizedFixedPath, fixedSessionNumber);
  }, [fixedSessionFetch?.noteExists, fixedSessionNumber, normalizedFixedPath, storage]);

  const handleSelectSession = useCallback(
    (sessionNumber: number) => setFixedSessionNumber(sessionNumber),
    [setFixedSessionNumber],
  );

  const handleTogglePin = useCallback(
    async (sessionNumber: number) => {
      await updateFixedSessionMeta(shell, storage, normalizedFixedPath, sessionNumber, (prev) => ({
        ...prev,
        createdAt: prev.createdAt ?? window.moment().toISOString(),
        pinned: !(prev.pinned ?? false),
      }));
      await mutate();
    },
    [mutate, normalizedFixedPath, shell, storage],
  );

  const handleRenameSession = useCallback(
    async (session: FixedSessionSummary) => {
      const nextValue = await showTextInput({
        title: "セッション名を入力",
        placeholder: `Session ${session.sessionNumber}`,
        defaultValue: session.title,
      });

      if (nextValue === null) {
        return;
      }

      const trimmedValue = nextValue.trim();
      await updateFixedSessionMeta(
        shell,
        storage,
        normalizedFixedPath,
        session.sessionNumber,
        (prev) => {
          const nextMeta = {
            ...prev,
            createdAt: prev.createdAt ?? window.moment().toISOString(),
            pinned: prev.pinned ?? false,
          };

          if (trimmedValue.length === 0 || trimmedValue === `Session ${session.sessionNumber}`) {
            delete nextMeta.name;
          } else {
            nextMeta.name = trimmedValue;
          }

          return nextMeta;
        },
      );
      await mutate();
    },
    [mutate, normalizedFixedPath, shell, showTextInput, storage],
  );

  const handleDeleteSession = useCallback(
    async (session: FixedSessionSummary) => {
      if (session.sessionNumber === 1) {
        new Notice("Session 1 はベースセッションなので削除できません");
        return;
      }

      if (editingPost) {
        new Notice("編集中はセッションを削除できません");
        return;
      }

      const confirmed = await confirmDelete({
        title: "セッションを削除",
        message: `${session.title} とその投稿を削除しますか？`,
        confirmText: "削除",
      });
      if (!confirmed) {
        return;
      }

      const note = shell.getAbstractFileByPath(normalizedFixedPath);
      if (!(note instanceof TFile)) {
        new Notice("削除対象のノートを解決できませんでした");
        return;
      }

      const content = await shell.loadFile(note.path);
      const { nextContent, removed } = removeFixedSessionSection({
        content,
        insertAfter: settings.insertAfter,
        sessionNumber: session.sessionNumber,
      });
      if (!removed) {
        new Notice("削除対象のセッションが見つかりませんでした");
        return;
      }

      await shell.modifyVaultFile(note, nextContent);
      await removeFixedSessionMeta(shell, storage, note.path, session.sessionNumber);

      if (fixedSessionNumber === session.sessionNumber) {
        const remainingSessionNumbers = sessions
          .map((item) => item.sessionNumber)
          .filter((sessionNumber) => sessionNumber !== session.sessionNumber)
          .sort((left, right) => left - right);
        const fallbackSessionNumber =
          remainingSessionNumbers.find((sessionNumber) => sessionNumber > session.sessionNumber) ??
          remainingSessionNumbers.at(-1) ??
          1;
        setFixedSessionNumber(fallbackSessionNumber);
      }

      // 意図: current session 削除時は setFixedSessionNumber 内で旧sessionの下書きを退避し直すため、
      // 切替後に対象sessionの local state をもう一度消して削除結果を確定させる。
      storage?.remove(getInputStorageKey("fixed", note.path, session.sessionNumber));
      storage?.remove(getDraftMetadataStorageKey("fixed", note.path, session.sessionNumber));

      await mutate();
    },
    [
      confirmDelete,
      editingPost,
      fixedSessionNumber,
      mutate,
      normalizedFixedPath,
      sessions,
      settings.insertAfter,
      setFixedSessionNumber,
      shell,
      storage,
    ],
  );

  const resolveOrCreateNote = useCallback(async (): Promise<TFile | null> => {
    const existing = shell.getAbstractFileByPath(normalizedFixedPath);
    if (existing instanceof TFile) return existing;

    const created = await createNoteWithInsertAfter(shell, settings);
    return created instanceof TFile ? created : null;
  }, [createNoteWithInsertAfter, normalizedFixedPath, settings, shell]);

  const handleCreateSession = useCallback(async () => {
    if (editingPost) {
      new Notice("編集中は新しいセッションを作れません");
      return;
    }

    const insertAfter = settings.insertAfter.trim();
    if (!insertAfter) {
      new Notice("fixed session を使うには insertAfter 見出しの設定が必要です");
      return;
    }

    const note = await resolveOrCreateNote();
    if (!note) {
      new Notice("セッション用ノートを作成できませんでした");
      return;
    }

    let content = "";
    try {
      content = await shell.loadFile(note.path);
    } catch {
      // 意図: 読み込み失敗を空ノートとして扱うと、既存本文を見出しだけで上書きしてしまう。
      // 新規ノートも作成後には読み込めるため、失敗時は選択と下書きを保持して作成を止める。
      new Notice("ノートを読み込めなかったため、セッションを作成できませんでした");
      return;
    }

    const existingSessions = buildFixedSessionSummaries({
      content,
      insertAfter,
      metaMap: await readFixedSessionMeta(shell, storage, note.path),
    });
    const nextSessionNumber = Math.max(1, ...existingSessions.map((s) => s.sessionNumber)) + 1;

    const { nextContent } = ensureFixedSessionHeading({
      content,
      insertAfter,
      sessionNumber: nextSessionNumber,
    });

    // 意図: session 見出しを先に永続化し、空 session でも一覧から消えないようにする。
    if (nextContent !== content) {
      await shell.modifyVaultFile(note, nextContent);
    }

    await updateFixedSessionMeta(shell, storage, note.path, nextSessionNumber, (prev) => ({
      ...prev,
      createdAt: prev.createdAt ?? window.moment().toISOString(),
      pinned: prev.pinned ?? false,
    }));

    setFixedSessionNumber(nextSessionNumber);
    await mutate();
  }, [
    editingPost,
    mutate,
    resolveOrCreateNote,
    settings.insertAfter,
    setFixedSessionNumber,
    shell,
    storage,
  ]);

  return {
    noteExists: fixedSessionFetch?.noteExists ?? false,
    sessionCount: fixedSessionFetch?.sessionCount ?? 0,
    shouldShowLoading,
    groupedSessions,
    fixedSessionNumber,
    editingPost,
    handleSelectSession,
    handleTogglePin,
    handleRenameSession,
    handleDeleteSession,
    handleCreateSession,
  };
};
