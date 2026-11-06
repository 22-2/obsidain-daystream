import type React from "react";
import { useCallback, useRef } from "react";
import { isBoardMoveNoop, type DropPlacement, type TextRange } from "src/core/board";
import type { Post } from "src/core/domain/post";
import { useAppContext } from "src/core/ui/context/AppContext";
import {
  clearActiveBoardDrag,
  getActiveBoardDrag,
  readBoardDragPayload,
  startBoardDrag,
} from "src/features/notes/utils/board-drag";
import {
  reorderBoardPosts,
  reportBoardOperationError,
} from "src/features/notes/utils/board-operations";
import { usePostHelpers } from "src/features/posts/hooks/internal/usePostHelpers";
import { usePosts } from "src/features/posts/hooks/usePosts";

const DROP_BEFORE_CLASS = "is-drop-before";
const DROP_AFTER_CLASS = "is-drop-after";
const DRAGGING_CLASS = "is-dragging";

interface DropIndicator {
  row: HTMLElement;
  placement: DropPlacement;
}

const toRange = (post: Post): TextRange => ({
  startOffset: post.startOffset,
  endOffset: post.endOffset,
});

/** スレッドは返信まで含めて1つの塊として動かす。 */
function getPostGroup(posts: Post[], post: Post): Post[] {
  if (post.threadRootId === null) return [post];
  return posts.filter(
    (candidate) => candidate.path === post.path && candidate.threadRootId === post.threadRootId,
  );
}

/** 塊の外枠。スレッドがファイル内に散らばっていても、前は先頭・後ろは末尾に揃える。 */
function getGroupSpan(group: Post[]): TextRange {
  return {
    startOffset: Math.min(...group.map((post) => post.startOffset)),
    endOffset: Math.max(...group.map((post) => post.endOffset)),
  };
}

function isDraggedGroup(group: Post[], moving: TextRange[]): boolean {
  return group.every((post) =>
    moving.some(
      (range) => range.startOffset === post.startOffset && range.endOffset === post.endOffset,
    ),
  );
}

function resolvePlacement(event: React.DragEvent<HTMLElement>): DropPlacement {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

/**
 * ボードのポストをドラッグで並べ替える。
 * 意図: ドロップ位置の線は常にホバー中の1行だけが持つ。前の行の線を消してから付けるので、
 * 行の境目に線が2本出ることはない。
 */
export function useBoardPostDrag() {
  const { shell } = useAppContext();
  const { posts } = usePosts();
  const { syncWrittenNote } = usePostHelpers();
  const indicatorRef = useRef<DropIndicator | null>(null);

  const clearIndicator = useCallback(() => {
    indicatorRef.current?.row.classList.remove(DROP_BEFORE_CLASS, DROP_AFTER_CLASS);
    indicatorRef.current = null;
  }, []);

  const showIndicator = useCallback(
    (row: HTMLElement, placement: DropPlacement) => {
      const current = indicatorRef.current;
      if (current?.row === row && current.placement === placement) return;

      clearIndicator();
      row.classList.add(placement === "before" ? DROP_BEFORE_CLASS : DROP_AFTER_CLASS);
      indicatorRef.current = { row, placement };
    },
    [clearIndicator],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, post: Post) => {
      const row = event.currentTarget.closest<HTMLElement>(".dstr-post-row");
      const ranges = getPostGroup(posts, post).map(toRange);
      startBoardDrag(event.dataTransfer, { kind: "posts", path: post.path, ranges }, post.message);
      if (!row) return;

      event.dataTransfer.setDragImage(row, 0, 0);
      row.classList.add(DRAGGING_CLASS);
    },
    [posts],
  );

  const handleDragEnd = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.currentTarget.closest(".dstr-post-row")?.classList.remove(DRAGGING_CLASS);
      clearIndicator();
      clearActiveBoardDrag();
    },
    [clearIndicator],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>, post: Post) => {
      const drag = getActiveBoardDrag();
      // 意図: 並べ替えは同じボード内だけ。別ボードへの移動はサイドバーへのドロップで行う。
      if (drag?.kind !== "posts" || drag.path !== post.path) return;

      if (isDraggedGroup(getPostGroup(posts, post), drag.ranges)) {
        clearIndicator();
        return;
      }

      const placement = resolvePlacement(event);
      // 意図: 今の位置と変わらない場所(移動中のポストの前後)には線を出さず、ドロップも受けない。
      const isNoop = isBoardMoveNoop({
        blocks: posts.filter((candidate) => candidate.path === post.path).map(toRange),
        moving: drag.ranges,
        target: getGroupSpan(getPostGroup(posts, post)),
        placement,
      });
      if (isNoop) {
        clearIndicator();
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      showIndicator(event.currentTarget, placement);
    },
    [clearIndicator, posts, showIndicator],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLElement>, post: Post) => {
      event.preventDefault();
      const placement = resolvePlacement(event);
      const payload = readBoardDragPayload(event.dataTransfer);
      clearIndicator();
      clearActiveBoardDrag();
      if (payload?.kind !== "posts" || payload.path !== post.path) return;

      try {
        const content = await reorderBoardPosts(shell, {
          path: post.path,
          moving: payload.ranges,
          target: getGroupSpan(getPostGroup(posts, post)),
          placement,
        });
        if (content !== null) await syncWrittenNote(post.path, content);
      } catch (error) {
        reportBoardOperationError("Failed to reorder board posts", error);
      }
    },
    [clearIndicator, posts, shell, syncWrittenNote],
  );

  return { handleDragStart, handleDragEnd, handleDragOver, handleDrop };
}
