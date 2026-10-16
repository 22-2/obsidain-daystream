import type { MemoRecord } from "src/core/db/daystream-db";
import type { MomentLike, Post } from "src/core/domain/post";

export const THREAD_METADATA_KEYS = {
  ID: "mfdiId",
  PARENT_ID: "parentId",
} as const;

export function createThreadId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) {
    return randomUuid.replace(/-/g, "").slice(0, 8);
  }

  return Math.random().toString(16).slice(2, 10).padEnd(8, "0").slice(0, 8);
}

export function resolvePostId(
  metadata: Record<string, string> | undefined,
  path: string,
  startOffset: number,
): string {
  return metadata?.[THREAD_METADATA_KEYS.ID] ?? `${path}:${startOffset}`;
}

export function resolveThreadRootId(metadata: Record<string, string> | undefined): string | null {
  return metadata?.[THREAD_METADATA_KEYS.PARENT_ID] ?? metadata?.[THREAD_METADATA_KEYS.ID] ?? null;
}

export function isThreadReply(post: Post): boolean {
  return post.threadRootId != null && post.threadRootId !== post.id;
}

export function isThreadRoot(post: Post): boolean {
  return post.threadRootId != null && post.threadRootId === post.id;
}

export function isVisibleRootPost(post: Post): boolean {
  return !isThreadReply(post);
}

export function countVisibleRootPosts(posts: Post[]): number {
  return posts.filter(isVisibleRootPost).length;
}

export function getThreadPosts(posts: Post[], rootId: string): Post[] {
  return posts.filter((post) => post.threadRootId === rootId);
}

function sortPostsDescending(posts: Post[]): Post[] {
  return [...posts].sort((left, right) => {
    const byTimestamp = right.timestamp.valueOf() - left.timestamp.valueOf();
    if (byTimestamp !== 0) {
      return byTimestamp;
    }
    return right.startOffset - left.startOffset;
  });
}

export function sortThreadPosts(posts: Post[], rootId: string): Post[] {
  const threadPosts = posts.filter((post) => post.threadRootId === rootId);
  return sortPostsDescending(threadPosts);
}

export function buildPostFromEntry(params: {
  time: string;
  message: string;
  metadata: Record<string, string>;
  offset: number;
  startOffset: number;
  endOffset: number;
  bodyStartOffset: number;
  path: string;
  noteDate: MomentLike;
  resolveTimestamp: (
    time: string,
    date: MomentLike,
    metadata?: Record<string, string>,
  ) => MomentLike;
}): Post {
  const {
    time,
    message,
    metadata = {},
    offset,
    startOffset,
    endOffset,
    bodyStartOffset,
    path,
    noteDate,
    resolveTimestamp,
  } = params;

  return {
    id: resolvePostId(metadata, path, startOffset),
    threadRootId: resolveThreadRootId(metadata),
    timestamp: resolveTimestamp(time, noteDate, metadata),
    noteDate,
    message,
    metadata,
    offset,
    startOffset,
    endOffset,
    bodyStartOffset,
    kind: "thino" as const,
    path,
  };
}

export function memoRecordToPost(record: MemoRecord): Post {
  const metadata = JSON.parse(record.metadataJson) as Record<string, string>;

  // 意図: Post.id は UI のスレッド判定キーとして使われる。
  // ルート投稿で `id=record.id(path:offset)` のままだと `threadRootId(mfdiId)` と一致せず
  // 返信扱いになってルートが非表示化されるため、metadata 由来のID解決を優先する。
  return {
    id: resolvePostId(metadata, record.path, record.startOffset),
    threadRootId: resolveThreadRootId(metadata),
    noteGranularity: record.noteGranularity,
    timestamp: window.moment(record.createdAt),
    noteDate: window.moment(record.createdAt).startOf("day"),
    message: record.content,
    metadata,
    offset: record.startOffset,
    startOffset: record.startOffset,
    endOffset: record.endOffset,
    bodyStartOffset: record.bodyStartOffset,
    kind: "thino" as const,
    path: record.path,
  };
}
