import { Menu } from "obsidian";
import type { MouseEvent } from "react";
import { useCallback } from "react";
import { createBoardNote } from "src/core/fixed-note";
import { VIEW_TYPE_DSTR } from "src/core/view-types";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useBoardList, type BoardSummary } from "src/features/notes/hooks/useBoards";
import type { MainView } from "src/features/workspace/types";
import { useDSTRView } from "src/features/workspace/views/useDSTRView";
import {
  createFixedNoteViewState,
  DEFAULT_DSTR_VIEW_STATE,
  type DSTRViewState,
} from "src/features/workspace/views/state";

const LAST_BOARD_STORAGE_KEY = "lastBoardPath";

// 意図: ボードへ入る直前の通常ビューの状態(日付・粒度・トピックなど)を view ごとに覚え、
// 戻るときにそのまま復元する。ボードを見ている間に日付ビューの位置を失わないため。
const returnStates = new WeakMap<object, DSTRViewState>();

/**
 * ボードとタイムライン・日付・インサイトの行き来を、今のタブの中で行う。
 * 意図: 別のタブを開かず、同じ view の state を切り替える。サイドバーとタブ列のどちらから
 * 開いても同じ経路になり、最後に開いたボードを覚えておける。
 */
export function useBoardNavigation() {
  const { shell, storage } = useAppContext();
  const component = useDSTRView();
  const boards = useBoardList();

  const openBoard = useCallback(
    async (path: string) => {
      storage.set(LAST_BOARD_STORAGE_KEY, path);
      const current = component.getState();
      if (current.noteMode === "periodic") returnStates.set(component.leaf, { ...current });
      await component.leaf.setViewState({
        type: VIEW_TYPE_DSTR,
        active: true,
        state: createFixedNoteViewState(path),
      });
    },
    [component, storage],
  );

  // 意図: 作成時に名前を聞かず「Untitled n」で作り、名前はサイドバーの「名前を変更」で付ける。
  const createBoard = useCallback(async () => {
    const folder = shell.getRawApp().vault.config.newFileFolderPath || "/";
    const note = await createBoardNote(shell, folder);
    await openBoard(note.path);
  }, [openBoard, shell]);

  /** 最後に開いたボード、無ければ先頭のボード、ボードが1つも無ければ新規作成へ進む。 */
  const enterBoards = useCallback(async () => {
    const lastPath = storage.get<string>(LAST_BOARD_STORAGE_KEY, "");
    const target: BoardSummary | undefined =
      boards.find((board) => board.path === lastPath) ?? boards[0];
    if (target) {
      await openBoard(target.path);
      return;
    }
    await createBoard();
  }, [boards, createBoard, openBoard, storage]);

  const leaveBoards = useCallback(
    async (mainView: MainView) => {
      const restored = returnStates.get(component.leaf) ?? DEFAULT_DSTR_VIEW_STATE;
      await component.leaf.setViewState({
        type: VIEW_TYPE_DSTR,
        active: true,
        state: { ...restored, mainView },
      });
    },
    [component],
  );

  /** 「ボード」タブの右クリック。通常ビューにいるままボードを選び、新規作成できる。 */
  const showBoardsMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      const currentPath = component.getState().file;
      const menu = new Menu();
      for (const board of boards) {
        menu.addItem((item) =>
          item
            .setTitle(board.title)
            .setIcon(board.path === currentPath ? "check" : "sticky-note")
            .onClick(() => void openBoard(board.path)),
        );
      }
      if (boards.length > 0) menu.addSeparator();
      menu.addItem((item) =>
        item
          .setTitle("新しいボード")
          .setIcon("plus")
          .onClick(() => void createBoard()),
      );
      menu.showAtMouseEvent(event.nativeEvent);
    },
    [boards, component, createBoard, openBoard],
  );

  return { boards, openBoard, createBoard, enterBoards, leaveBoards, showBoardsMenu };
}
