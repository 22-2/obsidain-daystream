import type React from "react";
import { BoardSidebar } from "src/features/notes/components/BoardSidebar";
import { FixedSessionSidebar } from "src/features/notes/components/FixedSessionSidebar";
import { useIsBoardFile } from "src/features/notes/hooks/useBoards";
import { useSettingsStore } from "src/features/workspace/store/settingsStore";

/** 固定ノートのサイドバー。ボードはセッション一覧の代わりにボード一覧を出す。 */
export const FixedNoteSidebar: React.FC = () => {
  const file = useSettingsStore((state) => state.file);
  return useIsBoardFile(file) ? <BoardSidebar /> : <FixedSessionSidebar />;
};
