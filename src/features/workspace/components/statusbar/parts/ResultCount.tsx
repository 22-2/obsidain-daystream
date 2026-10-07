import type { FC } from "react";
import {
  formatFixedNoteLabel,
  formatLabel,
  getVisibleRootCount,
} from "src/features/workspace/components/statusbar/parts/helper";
import {
  useDbTotalCount,
  useSettings,
  useTotalCount,
} from "src/features/workspace/components/statusbar/parts/hooks";
import { usePosts } from "src/features/posts/hooks/usePosts";
import { useTasksStore } from "src/features/tasks/store/tasksStore";
import { isTimelineView } from "src/features/workspace/utils/view-mode";
import { getFixedNoteTitle } from "src/features/workspace/views/state";
import { useShallow } from "zustand/shallow";

export const ResultCount: FC = () => {
  const settings = useSettings();
  const {
    granularity,
    asTask,
    dateFilter,
    timeFilter,
    displayMode,
    viewNoteMode,
    file,
    activeTopic,
  } = settings;

  const { tasks } = useTasksStore(useShallow((s) => ({ tasks: s.tasks })));
  const { posts } = usePosts();

  const dbTotalCount = useDbTotalCount(activeTopic);
  const totalCount = useTotalCount(displayMode, dbTotalCount, posts);

  const currentCount = asTask ? tasks.length : getVisibleRootCount(posts);

  if (viewNoteMode === "fixed") {
    const noteTitle = getFixedNoteTitle(file);
    return <>{formatFixedNoteLabel(currentCount, noteTitle, asTask)}</>;
  }

  const isDailyTimeFiltered =
    dateFilter === "today" && timeFilter !== "all" && granularity === "day";
  const showTotal = isDailyTimeFiltered || isTimelineView(displayMode);
  const totalSuffix = showTotal ? `/${totalCount}` : "";

  return <>{formatLabel(currentCount, totalSuffix, asTask)}</>;
};
