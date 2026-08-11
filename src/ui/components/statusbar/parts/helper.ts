import type { Post } from "src/ui/types";
import { isVisible } from "src/ui/utils/post-metadata";
import { countVisibleRootPosts } from "src/ui/utils/thread-utils";

export function getVisibleRootCount(posts: Post[]) {
  return countVisibleRootPosts(posts.filter((p) => isVisible(p.metadata)));
}

export function formatLabel(currentCount: number, totalSuffix: string, asTask: boolean) {
  return asTask ? `${currentCount} tasks` : `${currentCount}${totalSuffix} posts`;
}

export function formatFixedNoteLabel(currentCount: number, noteTitle: string, asTask: boolean) {
  return asTask ? `${currentCount} tasks in ${noteTitle}` : `${currentCount} posts in ${noteTitle}`;
}
