import { TFile } from "obsidian";
import { useEffect, useMemo, useState } from "react";
import { BOARD_FRONTMATTER_KEY } from "src/core/board";
import { isDSTRFixedNotePath, normalizeFixedNotePath } from "src/core/fixed-note";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { useAppContext } from "src/core/ui/context/AppContext";
import { readBoardOrder, sortByBoardOrder, subscribeBoardOrder } from "src/features/notes/utils/board-order";
import { getFixedNoteTitle } from "src/features/workspace/views/state";

export interface BoardSummary {
  path: string;
  title: string;
}

function isBoardFile(shell: ObsidianAppShell, file: TFile): boolean {
  if (!isDSTRFixedNotePath(file.path)) return false;
  return shell.getMetadataCache().getFileCache(file)?.frontmatter?.[BOARD_FRONTMATTER_KEY] === true;
}

// 意図: ボードの判定はフロントマターに依存するため、メタデータの更新と
// ファイルの改名・削除のたびに一覧と判定をやり直す。
function useBoardIndexVersion(): number {
  const { shell } = useAppContext();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const cache = shell.getMetadataCache();
    const vault = shell.getVault();
    const bump = () => setVersion((current) => current + 1);
    const refs = [cache.on("changed", bump), cache.on("deleted", bump)];
    const renameRef = vault.on("rename", bump);
    const unsubscribeOrder = subscribeBoardOrder(bump);

    return () => {
      refs.forEach((ref) => cache.offref(ref));
      vault.offref(renameRef);
      unsubscribeOrder();
    };
  }, [shell]);

  return version;
}

export function useIsBoardFile(path: string | null): boolean {
  const { shell } = useAppContext();
  const version = useBoardIndexVersion();

  return useMemo(() => {
    const file = shell.getAbstractFileByPath(normalizeFixedNotePath(path ?? ""));
    // version はメタデータ更新で判定をやり直すための依存
    return file instanceof TFile && isBoardFile(shell, file);
  }, [shell, path, version]);
}

export function useBoardList(): BoardSummary[] {
  const { shell, storage } = useAppContext();
  const version = useBoardIndexVersion();

  return useMemo(
    () =>
      sortByBoardOrder(
        shell
          .getVault()
          .getMarkdownFiles()
          .filter((file) => isBoardFile(shell, file))
          .map((file) => ({ path: file.path, title: getFixedNoteTitle(file.path) })),
        readBoardOrder(storage),
      ),
    // version はメタデータ更新で一覧をやり直すための依存
    [shell, storage, version],
  );
}
