import { TFile } from "obsidian";
import { useEffect } from "react";
import { resolveNoteSource } from "src/core/note-source";
import { useAppStore, useRequiredAppStore } from "src/ui/store/appStore";
import { useNoteStore } from "src/ui/store/noteStore";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isPostsKey } from "src/ui/utils/swr-utils";
import { mutate } from "swr";
import { useShallow } from "zustand/shallow";

export function useNoteSync() {
  const shell = useAppStore((s) => s.shell);
  const store = useRequiredAppStore();

  const { date, granularity, activeTopic, dateFilter, displayMode, setDate } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      granularity: s.granularity,
      activeTopic: s.activeTopic,
      dateFilter: s.dateFilter,
      displayMode: s.displayMode,
      setDate: s.setDate,
    })),
  );

  const { viewNoteMode, file } = useSettingsStore(
    useShallow((s) => ({
      viewNoteMode: s.viewNoteMode,
      file: s.file,
    })),
  );

  const { currentDailyNote, weekNotePaths } = useNoteStore(
    useShallow((s) => ({
      currentDailyNote: s.currentDailyNote,
      weekNotePaths: s.weekNotePaths,
    })),
  );

  const { setTasks, updateTasks } = usePostsStore(
    useShallow((s) => ({
      setTasks: s.setTasks,
      updateTasks: s.updateTasks,
    })),
  );

  useEffect(() => {
    if (!shell) return;

    const noteSource = resolveNoteSource({
      shell,
      date,
      granularity,
      activeTopic,
      noteMode: viewNoteMode,
      file,
    });

    const refreshPosts = async () => {
      // 全ての 'posts' に関連するキャッシュを再検証
      await mutate(isPostsKey);
    };

    const handleChanged = async (file: TFile) => {
      if (!noteSource.matchesPath(file.path, currentDailyNote)) return;

      store.getState().updateCurrentDailyNote(shell);
      // タスク（Markdownとしてのタスク）はシェルから直接取得するため、ここで更新する。
      // ポスト（DB管理）の更新は Worker からの通知 (useDbSync) に任せることで
      // DB更新前の古いデータをフェッチしてしまうレースコンディションを防ぐ。
      await updateTasks(file);
    };

    const handleDelete = async (file: { path: string }) => {
      if (noteSource.mode === "fixed") {
        if (!noteSource.matchesPath(file.path, currentDailyNote)) return;
        store.getState().setCurrentDailyNote(null);
        setTasks([]);
        return;
      }

      // 削除時のポスト更新も Worker からの通知に任せる。

      if (file.path !== currentDailyNote?.path) return;
      setDate(date.clone());
      setTasks([]);
    };

    const changedRef = shell.getMetadataCache().on("changed", handleChanged);
    const deleteRef = shell.getVault().on("delete", handleDelete);
    const createRef = shell.getVault().on("create", (file) => {
      if (file instanceof TFile) handleChanged(file);
    });

    return () => {
      shell.getMetadataCache().offref(changedRef);
      shell.getVault().offref(deleteRef);
      shell.getVault().offref(createRef);
    };
  }, [
    shell,
    date,
    granularity,
    activeTopic,
    dateFilter,
    displayMode,
    setDate,
    viewNoteMode,
    file,
    currentDailyNote,
    weekNotePaths,
    setTasks,
    updateTasks,
    store,
  ]);
}
