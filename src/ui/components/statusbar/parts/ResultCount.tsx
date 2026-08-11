import type { FC } from "react";
import {
  formatFixedNoteLabel,
  formatLabel,
  getVisibleRootCount,
} from "src/ui/components/statusbar/parts/helper";
import {
  useDbTotalCount,
  useSettings,
  useTotalCount,
} from "src/ui/components/statusbar/parts/hooks";
import { usePosts } from "src/ui/hooks/usePosts";
import { usePostsStore } from "src/ui/store/postsStore";
import { isTimelineView } from "src/ui/utils/view-mode";
import { getFixedNoteTitle } from "src/ui/view/state";
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

  const { tasks } = usePostsStore(useShallow((s) => ({ tasks: s.tasks })));
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
