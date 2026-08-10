import type { DateFilter, Granularity, Post, TimeFilter } from "src/ui/types";

export function filterPostsByRelativeWindow(
  posts: Post[],
  params: {
    dateFilter: DateFilter;
    timeFilter: TimeFilter;
    asTask: boolean;
    granularity: Granularity;
  },
): Post[] {
  const { dateFilter, timeFilter, asTask, granularity } = params;
  const now = window.moment();

  // fixedノートは単一ノート全件を保持するため、期間は現在時刻からの相対窓で絞る。
  const dateFilteredPosts = posts.filter((post) => {
    if (dateFilter === "today") {
      return post.timestamp.isSame(now, "day") && !post.timestamp.isAfter(now);
    }

    if (dateFilter === "this_week") {
      const start = now.clone().startOf("isoWeek");
      return !post.timestamp.isBefore(start) && !post.timestamp.isAfter(now);
    }

    if (dateFilter === "this_month") {
      const start = now.clone().startOf("month");
      return !post.timestamp.isBefore(start) && !post.timestamp.isAfter(now);
    }

    if (dateFilter === "this_year") {
      const start = now.clone().startOf("year");
      return !post.timestamp.isBefore(start) && !post.timestamp.isAfter(now);
    }

    const days = Number.parseInt(dateFilter, 10);
    if (Number.isNaN(days)) {
      return true;
    }

    const start = now
      .clone()
      .startOf("day")
      .subtract(days - 1, "days");
    return !post.timestamp.isBefore(start) && !post.timestamp.isAfter(now);
  });

  if (timeFilter === "all" || asTask || granularity !== "day") {
    return dateFilteredPosts;
  }

  if (dateFilter !== "today") {
    return dateFilteredPosts;
  }

  if (timeFilter === "latest") {
    return dateFilteredPosts.length > 0 ? [dateFilteredPosts[0]] : [];
  }

  const hours = Number.parseInt(timeFilter, 10);
  if (Number.isNaN(hours)) {
    return dateFilteredPosts;
  }

  return dateFilteredPosts.filter(
    (post) => now.diff(post.timestamp, "hours", true) < hours,
  );
}
