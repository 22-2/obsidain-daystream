import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { collapseExcessBlankLines, resolveTimestamp, toText } from "src/core/post-utils";
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

/**
 * 投稿を書き戻すときの時刻書式に使う粒度を決める。
 * 意図: 表示中の粒度ではなく投稿元ノートの粒度に合わせ、タイムラインや月表示から
 * 日次ノートの投稿を書き換えたときに `HH:mm` が日付付きへ変わるのを防ぐ。
 */
export function resolvePostGranularity(post: Post, fallback: Granularity): Granularity {
  return post.noteGranularity ?? fallback;
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

  // 意図: 再採番やノート編集でIDが変わっても、同一内容・日時の投稿を安全に探す。
  const latestPost =
    latestPosts.find((candidate) => candidate.id === post.id) ??
    latestPosts.find(
      (candidate) =>
        candidate.message.trim() === post.message.trim() &&
        candidate.timestamp.valueOf() === post.timestamp.valueOf(),
    );
  if (!latestPost) return null;

  // 意図: 本文の再解析では投稿元ノートの粒度が分からないため、元の投稿から引き継ぐ。
  return { ...latestPost, noteGranularity: post.noteGranularity };
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
  return latestPosts
    .filter((post) => post.threadRootId === rootPost.threadRootId)
    .map((post) => ({ ...post, noteGranularity: rootPost.noteGranularity }));
}

/** 書き戻した投稿と、書き込み後のノート全文。全文はDBへの即時反映に使う。 */
export interface PostWriteResult<T> {
  posts: T;
  content: string;
}

/**
 * 同じノート内の投稿を取り除き、空行を詰めた全文を1回で書き込む。
 * 意図: 削除と空行の整理を別々に書くと vault の変更イベントが重複して発火し、
 * インデックスと再検証が連鎖するため、1 read + 1 write に畳む。
 */
export async function removePostsFromNote(params: {
  shell: ObsidianAppShell;
  path: string;
  posts: Post[];
}): Promise<string> {
  const content = await params.shell.loadFile(params.path);
  // 意図: 後ろの投稿から取り除き、前の投稿の offset がずれないようにする。
  const removed = [...params.posts]
    .sort((a, b) => b.startOffset - a.startOffset)
    .reduce((text, post) => text.slice(0, post.startOffset) + text.slice(post.endOffset), content);
  const nextContent = collapseExcessBlankLines(removed);
  await params.shell.writeFile(params.path, nextContent);
  return nextContent;
}

/** 最新offsetに対してmetadataを保存する。見つからない場合は副作用を行わずnullを返す。 */
export async function replaceLatestPostMetadata(params: {
  shell: ObsidianAppShell;
  insertAfter: string;
  noteMode: "fixed" | "periodic";
  granularity: Granularity;
  post: Post;
  transformMetadata: (previous: Record<string, string>) => Record<string, string>;
}): Promise<PostWriteResult<Post> | null> {
  const latestPost = await findLatestPostInNote(params);
  if (!latestPost) return null;

  const text = toText(
    latestPost.message,
    resolvePostGranularity(latestPost, params.granularity),
    latestPost.timestamp,
    params.transformMetadata({ ...latestPost.metadata }),
  );
  const content = await params.shell.replaceRange(
    latestPost.path,
    latestPost.startOffset,
    latestPost.endOffset,
    text,
  );
  return { posts: latestPost, content };
}

/**
 * 複数投稿は現行offsetで並べ、後方から置換して後続offsetのずれを防ぐ。
 * 呼び出し側はスレッドなど同じノート内の投稿だけを渡す前提で、最後に書いた全文を返す。
 */
export async function replaceLatestPostsMetadata(params: {
  shell: ObsidianAppShell;
  granularity: Granularity;
  posts: Post[];
  resolveLatest: (post: Post) => Promise<Post | null>;
  buildMetadata: (post: Post) => Record<string, string>;
}): Promise<PostWriteResult<Post[]> | null> {
  const latestPosts = (await Promise.all(params.posts.map(params.resolveLatest))).filter(
    (post): post is Post => post !== null,
  );
  const sortedPosts = [...latestPosts].sort((a, b) => b.startOffset - a.startOffset);
  if (sortedPosts.length === 0) return null;

  let content = "";

  for (const post of sortedPosts) {
    // 意図: 単体更新と同じく投稿自身の日時で書き戻し、時刻を日付だけに丸めない。
    const text = toText(
      post.message,
      resolvePostGranularity(post, params.granularity),
      post.timestamp,
      {
        ...post.metadata,
        ...params.buildMetadata(post),
      },
    );
    content = await params.shell.replaceRange(post.path, post.startOffset, post.endOffset, text);
  }

  return { posts: sortedPosts, content };
}
