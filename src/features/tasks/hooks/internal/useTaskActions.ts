import { Notice } from "obsidian";
import { useCallback } from "react";
import { collapseExcessBlankLines } from "src/core/post-utils";
import type { Task } from "src/core/task-text";
import { useAppStore } from "src/features/workspace/store/appStore";
import { useNoteStore } from "src/features/notes/store/noteStore";
import { useTasksStore } from "src/features/tasks/store/tasksStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { useShallow } from "zustand/shallow";

export const useTaskActions = () => {
  const shell = useAppStore((s) => s.shell);

  const isReadOnly = useSettingsStore((s) => s.isReadOnly());

  const noteState = useNoteStore(
    useShallow((s) => ({
      currentDailyNote: s.currentDailyNote,
    })),
  );

  const postsState = useTasksStore(
    useShallow((s) => ({
      tasks: s.tasks,
      setTasks: s.setTasks,
    })),
  );

  const updateTaskChecked = useCallback(
    async (task: Task, checked: boolean) => {
      if (isReadOnly) {
        new Notice("過去のノートのタスクは変更できません");
        return;
      }
      if (!noteState.currentDailyNote) return;
      if (!shell) return;
      const mark = checked ? "x" : " ";
      postsState.setTasks(
        postsState.tasks.map((x) => (x.offset === task.offset ? { ...x, mark } : x)),
      );
      await shell.setCheckMark(noteState.currentDailyNote.path, mark, task.offset);
    },
    [noteState.currentDailyNote, postsState.tasks, postsState.setTasks, shell, isReadOnly],
  );

  const openTaskInEditor = useCallback(
    async (task: Task) => {
      if (!noteState.currentDailyNote) return;
      if (!shell) return;
      const leaf = shell.getLeaf(true);
      await leaf.openFile(noteState.currentDailyNote);
      const editor = shell.getActiveMarkdownEditor();
      if (!editor) return;
      const pos = editor.offsetToPos(task.offset);
      editor.setCursor(pos);
      await leaf.openFile(noteState.currentDailyNote, {
        eState: { line: pos.line },
      });
    },
    [shell, noteState.currentDailyNote],
  );

  const deleteTask = useCallback(
    async (task: Task) => {
      if (isReadOnly) {
        new Notice("過去のノートのタスクは削除できません");
        return;
      }
      if (!noteState.currentDailyNote) return;
      const path = noteState.currentDailyNote.path;
      if (!shell) return;
      const origin = await shell.loadFile(path);
      const start = task.offset;
      let end = origin.indexOf("\n", start);
      if (end === -1) end = origin.length;
      else end += 1;
      // 意図: 行の削除と空行の整理を1回の書き込みにまとめ、変更イベントの重複を防ぐ。
      await shell.writeFile(
        path,
        collapseExcessBlankLines(origin.slice(0, start) + origin.slice(end)),
      );
      postsState.setTasks((await shell.getTasks(noteState.currentDailyNote)) ?? []);
    },
    [shell, noteState.currentDailyNote, isReadOnly, postsState.setTasks],
  );

  return {
    updateTaskChecked,
    openTaskInEditor,
    deleteTask,
  };
};
