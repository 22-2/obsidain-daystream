import { Menu, Notice } from "obsidian";
import type React from "react";
import { useCallback, useState } from "react";
import { isBoardMoveNoop, type DropPlacement } from "src/core/board";
import {
  normalizeFixedNotePath,
  renameFixedNote,
  trashFixedNote,
} from "src/core/fixed-note";
import { Box, HStack, Text, VStack } from "src/core/ui/components/primitives";
import { cn } from "src/core/ui/components/primitives/utils";
import { useAppContext } from "src/core/ui/context/AppContext";
import type { BoardSummary } from "src/features/notes/hooks/useBoards";
import { useBoardNavigation } from "src/features/notes/hooks/useBoardNavigation";
import { moveBoardInOrder, writeBoardOrder } from "src/features/notes/utils/board-order";
import {
  clearActiveBoardDrag,
  getActiveBoardDrag,
  hasBoardDragType,
  readBoardDragPayload,
  startBoardDrag,
} from "src/features/notes/utils/board-drag";
import {
  mergeBoards,
  movePostsToBoard,
  reportBoardOperationError,
} from "src/features/notes/utils/board-operations";
import { usePostHelpers } from "src/features/posts/hooks/internal/usePostHelpers";
import {
  SidebarSectionHeader,
  SidebarTextButton,
} from "src/features/workspace/components/layout/SidebarPrimitives";
import { useObsidianUi } from "src/features/workspace/hooks/useObsidianUi";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";

function canDropOn(targetPath: string): boolean {
  const drag = getActiveBoardDrag();
  return drag !== null && drag.path !== targetPath;
}

/** ボードの並べ替えで、動かすボードの今の位置と変わらない場所か。 */
function isNoopBoardReorder(
  boards: BoardSummary[],
  moving: string,
  target: string,
  placement: DropPlacement,
): boolean {
  const blocks = boards.map((_, index) => ({ startOffset: index, endOffset: index + 1 }));
  const indexOf = (path: string) => boards.findIndex((board) => board.path === path);
  const movingIndex = indexOf(moving);
  const targetIndex = indexOf(target);
  if (movingIndex === -1 || targetIndex === -1) return true;
  return isBoardMoveNoop({
    blocks,
    moving: [blocks[movingIndex]],
    target: blocks[targetIndex],
    placement,
  });
}

export const BoardSidebar: React.FC = () => {
  const { shell, storage } = useAppContext();
  const { showTextInput, confirmDelete } = useObsidianUi();
  const { refreshPosts } = usePostHelpers();
  const { boards, openBoard, createBoard } = useBoardNavigation();
  const currentPath = useSettingsStore((state) => normalizeFixedNotePath(state.file ?? ""));
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
  // 意図: ボードの並べ替えの線は常に1行だけが持つので、状態を1つにして境目に2本出ないようにする。
  const [dropLine, setDropLine] = useState<{ path: string; placement: DropPlacement } | null>(
    null,
  );

  const handleRename = useCallback(
    async (board: BoardSummary) => {
      const next = await showTextInput({
        title: "ボード名を入力",
        placeholder: board.title,
        defaultValue: board.title,
      });
      if (next === null || next.trim() === "" || next.trim() === board.title) return;
      await renameFixedNote(shell, board.path, next);
    },
    [shell, showTextInput],
  );

  const handleDelete = useCallback(
    async (board: BoardSummary) => {
      const confirmed = await confirmDelete({
        title: "ボードを削除",
        message: `${board.title} とその投稿をゴミ箱へ移動しますか？`,
        confirmText: "削除",
      });
      if (confirmed) await trashFixedNote(shell, board.path);
    },
    [confirmDelete, shell],
  );

  const handleMerge = useCallback(
    async (source: BoardSummary, dest: BoardSummary) => {
      const confirmed = await confirmDelete({
        title: "ボードをマージ",
        message: `${source.title} の投稿を ${dest.title} の末尾へ移し、${source.title} をゴミ箱へ移動しますか？`,
        confirmText: "マージ",
      });
      if (!confirmed) return;

      try {
        await mergeBoards(shell, { sourcePath: source.path, destPath: dest.path });
        // 意図: 開いているボードが消える場合は、残ったほうのボードへ移る。
        if (source.path === currentPath) await openBoard(dest.path);
        await refreshPosts();
      } catch (error) {
        reportBoardOperationError("Failed to merge boards", error);
      }
    },
    [confirmDelete, currentPath, openBoard, refreshPosts, reportBoardOperationError, shell],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>, dest: BoardSummary) => {
      event.preventDefault();
      setDropTargetPath(null);
      const line = dropLine;
      setDropLine(null);
      const payload = readBoardDragPayload(event.dataTransfer);
      clearActiveBoardDrag();
      if (!payload || payload.path === dest.path) return;

      if (payload.kind === "board") {
        // 意図: ボードのドラッグは並べ替え。マージは右クリックの「マージ先」から行う。
        if (line?.path !== dest.path) return;
        writeBoardOrder(
          storage,
          moveBoardInOrder({
            paths: boards.map((board) => board.path),
            moving: payload.path,
            target: dest.path,
            placement: line.placement,
          }),
        );
        return;
      }

      try {
        await movePostsToBoard(shell, {
          sourcePath: payload.path,
          destPath: dest.path,
          ranges: payload.ranges,
        });
        new Notice(`${dest.title} へ移動しました`);
        await refreshPosts();
      } catch (error) {
        reportBoardOperationError("Failed to move posts to board", error);
      }
    },
    [boards, dropLine, refreshPosts, shell, storage],
  );

  const handleOpenMenu = useCallback(
    (board: BoardSummary, event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const menu = new Menu();
      menu.addItem((item) =>
        item
          .setTitle(board.path === currentPath ? "現在のボード" : "このボードを開く")
          .setIcon("check")
          .setDisabled(board.path === currentPath)
          .onClick(() => void openBoard(board.path)),
      );
      menu.addItem((item) =>
        item
          .setTitle("名前を変更")
          .setIcon("pencil")
          .onClick(() => void handleRename(board)),
      );

      const mergeTargets = boards.filter((other) => other.path !== board.path);
      if (mergeTargets.length > 0) {
        menu.addSeparator();
        menu.addItem((item) => item.setTitle("マージ先").setIcon("merge").setDisabled(true));
        for (const target of mergeTargets) {
          menu.addItem((item) =>
            item.setTitle(target.title).onClick(() => void handleMerge(board, target)),
          );
        }
      }

      menu.addSeparator();
      menu.addItem((item) =>
        item
          .setTitle("削除")
          .setIcon("trash")
          .setWarning(true)
          .onClick(() => void handleDelete(board)),
      );
      menu.showAtMouseEvent(event.nativeEvent);
    },
    [boards, currentPath, handleDelete, handleMerge, handleRename, openBoard],
  );

  return (
    <VStack className="dstr-board-sidebar h-full items-stretch gap-0 overflow-y-auto">
      <SidebarSectionHeader
        className="px-3 pt-2"
        rightAddon={
          <Text className="text-[11px] font-medium text-[var(--text-muted)]">{boards.length}</Text>
        }
      >
        Boards
      </SidebarSectionHeader>

      <SidebarTextButton
        className={cn(
          "mx-2 mt-3 !h-8 py-4 justify-center rounded-[var(--radius-s)]",
          "bg-[color-mix(in_srgb,var(--color-accent),transparent_88%)] text-[var(--color-accent)]",
          "hover:bg-[color-mix(in_srgb,var(--color-accent),transparent_80%)]",
        )}
        onClick={() => {
          void createBoard();
        }}
      >
        <Text
          as="span"
          className="text-[length:var(--dstr-panel-label-font-size)] font-medium text-[inherit]"
        >
          New Board
        </Text>
      </SidebarTextButton>

      <VStack className="items-stretch gap-1 px-1 pb-3 pt-2">
        {boards.map((board) => {
          const isSelected = board.path === currentPath;
          return (
            <Box
              key={board.path}
              className={cn(
                "dstr-board-item rounded-[var(--radius-s)]",
                dropTargetPath === board.path && "is-drop-target",
                dropLine?.path === board.path &&
                  (dropLine.placement === "before" ? "is-drop-before" : "is-drop-after"),
              )}
              draggable
              onDragStart={(event: React.DragEvent<HTMLDivElement>) =>
                startBoardDrag(
                  event.dataTransfer,
                  { kind: "board", path: board.path },
                  board.title,
                )
              }
              onDragEnd={() => {
                clearActiveBoardDrag();
                setDropTargetPath(null);
                setDropLine(null);
              }}
              onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                if (!hasBoardDragType(event.dataTransfer) || !canDropOn(board.path)) return;
                const drag = getActiveBoardDrag();
                if (drag?.kind === "board") {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const placement: DropPlacement =
                    event.clientY < rect.top + rect.height / 2 ? "before" : "after";
                  setDropTargetPath(null);
                  if (isNoopBoardReorder(boards, drag.path, board.path, placement)) {
                    setDropLine(null);
                    return;
                  }
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropLine((current) =>
                    current?.path === board.path && current.placement === placement
                      ? current
                      : { path: board.path, placement },
                  );
                  return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTargetPath(board.path);
              }}
              onDragLeave={(event: React.DragEvent<HTMLDivElement>) => {
                // 意図: 子要素へ入っただけでは解除せず、項目の外へ出たときだけ解除する。
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setDropTargetPath((current) => (current === board.path ? null : current));
                setDropLine((current) => (current?.path === board.path ? null : current));
              }}
              onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                void handleDrop(event, board);
              }}
            >
              <SidebarTextButton
                isSelected={isSelected}
                className="min-h-[36px] w-full"
                onClick={() => void openBoard(board.path)}
                onContextMenu={(event) => handleOpenMenu(board, event)}
              >
                <HStack className="min-w-0 items-center gap-1.5">
                  <Text as="span" className="truncate">
                    {board.title}
                  </Text>
                </HStack>
              </SidebarTextButton>
            </Box>
          );
        })}
      </VStack>
    </VStack>
  );
};
