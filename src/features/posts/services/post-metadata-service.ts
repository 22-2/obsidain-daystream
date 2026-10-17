import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { resolveTimestamp, toText } from "src/core/post-utils";
import { parseThinoEntries } from "src/core/thino";
import type { Post } from "src/core/domain/post";
import type { Granularity } from "src/core/domain/granularity";
import type { DSTRNoteMode } from "src/core/domain/note-mode";
import { buildFixedSessionPosts } from "src/features/notes/utils/fixed-session-utils";
import { buildPostFromEntry } from "src/features/posts/utils/thread-utils";

/** 意図: ノートの最新内容とoffset再特定をReact状態から分離し、保存契約を一箇所に保つ。 */
async function readLatestPostsForPath(params: {
  shell: ObsidianAppShell;
  insertAfter: string;
  noteMode: DSTRNoteMode;
  path: string;
  noteDate: Post["noteDate"];
}): Promise<Post[]> {
  const { shell, insertAfter, noteMode, path, noteDate } = params;
  const content = (await shell.loadFile(path)).replace(/\/n/g, "\n");
  if (noteMode === "fixed") {
    return buildFixedSessionPosts({
      content,
      insertAfter,
      path,
      referenceDate: noteDate,
    });
  }

  return parseThinoEntries(content).map((entry) =>
    buildPostFromEntry({ ...entry, path, noteDate, resolveTimestamp }),
  );
}

/** IDが変化した場合も、本文と日時が一致する投稿を最新ノートから再特定する。 */
export async function findLatestPostInNote(params: {
  shell: ObsidianAppShell;
  insertAfter: string;
  noteMode: DSTRNoteMode;
  post: Post;
}): Promise<Post | null> {
  const { post } = params;
  const latestPosts = await readLatestPostsForPath({ ...params, path: post.path, noteDate: post.noteDate });

  const latestById = latestPosts.find((candidate) => candidate.id === post.id);
  if (latestById) return latestById;

  // 意図: 再採番やノート編集でIDが変わっても、同一内容・日時の投稿を安全に探す。
  return (
    latestPosts.find(
      (candidate) =>
        candidate.message.trim() === post.message.trim() &&
        candidate.timestamp.valueOf() === post.timestamp.valueOf(),
    ) ?? null
  );
}

export async function findLatestThreadPostsInNote(params: {
  shell: ObsidianAppShell;
  insertAfter: string;
  noteMode: DSTRNoteMode;
  rootPost: Post;
}): Promise<Post[]> {
  const { rootPost } = params;
  const latestPosts = await readLatestPostsForPath({
    ...params,
    path: rootPost.path,
    noteDate: rootPost.noteDate,
  });
  return latestPosts.filter((post) => post.threadRootId === rootPost.threadRootId);
}

/** 最新offsetに対してmetadataを保存する。見つからない場合は副作用を行わずnullを返す。 */
export async function replaceLatestPostMetadata(params: {
  shell: ObsidianAppShell;
  insertAfter: string;
  noteMode: "fixed" | "periodic";
  granularity: Granularity;
  post: Post;
  transformMetadata: (previous: Record<string, string>) => Record<string, string>;
}): Promise<Post | null> {
  const latestPost = await findLatestPostInNote(params);
  if (!latestPost) return null;

  const text = toText(
    latestPost.message,
    false,
    params.granularity,
    latestPost.timestamp,
    params.transformMetadata({ ...latestPost.metadata }),
  );
  await params.shell.replaceRange(
    latestPost.path,
    latestPost.startOffset,
    latestPost.endOffset,
    text,
  );
  return latestPost;
}

/** 複数投稿は現行offsetで並べ、後方から置換して後続offsetのずれを防ぐ。 */
export async function replaceLatestPostsMetadata(params: {
  shell: ObsidianAppShell;
  granularity: Granularity;
  posts: Post[];
  resolveLatest: (post: Post) => Promise<Post | null>;
  buildMetadata: (post: Post) => Record<string, string>;
}): Promise<Post[]> {
  const latestPosts = (await Promise.all(params.posts.map(params.resolveLatest))).filter(
    (post): post is Post => post !== null,
  );
  const sortedPosts = [...latestPosts].sort((a, b) => b.startOffset - a.startOffset);

  for (const post of sortedPosts) {
    // 意図: 単体更新と同じく投稿自身の日時で書き戻し、時刻を日付だけに丸めない。
    const text = toText(post.message, false, params.granularity, post.timestamp, {
      ...post.metadata,
      ...params.buildMetadata(post),
    });
    await params.shell.replaceRange(post.path, post.startOffset, post.endOffset, text);
  }

  return sortedPosts;
}
