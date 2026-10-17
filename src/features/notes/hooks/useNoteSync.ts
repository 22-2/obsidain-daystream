import { TFile } from "obsidian";
import { useEffect } from "react";
import { reportError } from "src/core/error-report";
import { resolveNoteSource } from "src/core/note-source";
import { useAppStore, useRequiredAppStore } from "src/features/workspace/store/appStore";
import { useNoteStore } from "src/features/notes/store/noteStore";
import { useTasksStore } from "src/features/tasks/store/tasksStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
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

  const { setTasks, updateTasks } = useTasksStore(
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

    const handleChanged = (file: TFile) => {
      if (!noteSource.matchesPath(file.path, currentDailyNote)) return;

      store.getState().updateCurrentDailyNote(shell);
      // タスク（Markdownとしてのタスク）はシェルから直接取得するため、ここで更新する。
      // ポスト（DB管理）の更新は Worker からの通知 (useDbSync) に任せることで
      // DB更新前の古いデータをフェッチしてしまうレースコンディションを防ぐ。
      updateTasks(file).catch((error: unknown) =>
        reportError({ context: "Failed to update tasks", error, details: { path: file.path } }),
      );
    };

    const handleDelete = (file: { path: string }) => {
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
