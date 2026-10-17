import type React from "react";
import { Menu } from "obsidian";
import { memo, useCallback, useMemo } from "react";
import { reportError } from "src/core/error-report";
import type { Task } from "src/core/task-text";
import { Box } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";
import { TaskView } from "src/features/tasks/components/tasks/TaskView";
import { useTaskActions } from "src/features/tasks/hooks/internal/useTaskActions";
import { useObsidianUi } from "src/features/workspace/hooks/useObsidianUi";
import { useTasksStore } from "src/features/tasks/store/tasksStore";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";
import { useShallow } from "zustand/shallow";

// 意図: タスク操作は UI のイベントから待たずに実行されるため、失敗はここで記録して利用者へ知らせる。
const reportCheckFailure = (error: unknown) =>
  reportError({
    context: "Failed to update task check mark",
    error,
    notice: "タスクを変更できませんでした",
  });
const reportOpenFailure = (error: unknown) =>
  reportError({
    context: "Failed to open task in editor",
    error,
    notice: "ノートを開けませんでした",
  });

export const TaskListView: React.FC = memo(() => {
  const { confirmDeleteAction } = useObsidianUi();
  const { date, granularity, timeFilter, isReadOnly } = useSettingsStore(
    useShallow((s) => ({
      date: s.date,
      granularity: s.granularity,
      timeFilter: s.timeFilter,
      isReadOnly: s.isReadOnly(),
    })),
  );

  const { tasks } = useTasksStore(
    useShallow((s) => ({
      tasks: s.tasks,
    })),
  );

  const { updateTaskChecked, openTaskInEditor, deleteTask } = useTaskActions();

  const handleTaskChecked = useCallback(
    (task: Task, checked: boolean) => {
      updateTaskChecked(task, checked).catch(reportCheckFailure);
    },
    [updateTaskChecked],
  );

  const handleOpenTask = useCallback(
    (task: Task) => {
      openTaskInEditor(task).catch(reportOpenFailure);
    },
    [openTaskInEditor],
  );

  const showTaskContextMenu = useCallback(
    (task: (typeof tasks)[number], e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const menu = new Menu();
      menu.addItem((item) =>
        item.setTitle("タスクにジャンプ").onClick(() => handleOpenTask(task)),
      );
      menu.addItem((item) => item.setTitle("編集").onClick(() => handleOpenTask(task)));
      menu.addItem((item) =>
        item
          .setTitle("削除")
          .setDisabled(isReadOnly)
          .onClick(() => {
            confirmDeleteAction(() => deleteTask(task));
          }),
      );
      menu.showAtMouseEvent(e.nativeEvent);
    },
    [confirmDeleteAction, deleteTask, handleOpenTask, isReadOnly],
  );

  const incompleteTasks = useMemo(() => tasks.filter((x) => x.mark === " "), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((x) => x.mark !== " "), [tasks]);

  // タスクレンダラー（未完了・完了で共通）
  const renderTaskList = (taskList: typeof tasks) => (
    <Box className={cn("flex flex-col py-[var(--size-4-4)]")}>
      {taskList.map((task) => (
        <Box
          key={date.format() + String(task.offset)}
          className={cn("m-10")} // 元の Box className="m-10" を継承
        >
          <TaskView
            task={task}
            granularity={granularity}
            timeFilter={timeFilter}
            onChange={(c) => handleTaskChecked(task, c)}
            onContextMenu={showTaskContextMenu}
            disabled={isReadOnly}
          />
        </Box>
      ))}
    </Box>
  );

  return (
    <Box className="task-list-container flex flex-col w-full">
      {incompleteTasks.length > 0 && renderTaskList(incompleteTasks)}
      {completedTasks.length > 0 && renderTaskList(completedTasks)}
    </Box>
  );
});
