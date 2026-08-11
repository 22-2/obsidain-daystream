import { Menu } from "obsidian";
import { memo, useCallback, useMemo } from "react";
import { Box } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";
import { TaskView } from "src/ui/components/tasks/TaskView";
import { useTaskActions } from "src/ui/hooks/internal/useTaskActions";
import { useObsidianUi } from "src/ui/hooks/useObsidianUi";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

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

  const { tasks } = usePostsStore(
    useShallow((s) => ({
      tasks: s.tasks,
    })),
  );

  const { updateTaskChecked, openTaskInEditor, deleteTask } = useTaskActions();

  const showTaskContextMenu = useCallback(
    (task: (typeof tasks)[number], e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const menu = new Menu();
      menu.addItem((item) =>
        item.setTitle("タスクにジャンプ").onClick(() => openTaskInEditor(task)),
      );
      menu.addItem((item) => item.setTitle("編集").onClick(() => openTaskInEditor(task)));
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
    [confirmDeleteAction, deleteTask, isReadOnly, openTaskInEditor],
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
            onChange={(c) => updateTaskChecked(task, c)}
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
